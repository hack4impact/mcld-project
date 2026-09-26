"use server";
import {
   saveCoordinatorWeeklyHoursSchema,
   setCoordinatorAvailabilityOverrideSchema,
   clearCoordinatorAvailabilityOverrideSchema,
   listCoordinatorAvailabilitySchema,
   listCoordinatorAvailabilityOverridesSchema,
   fetchCoordinatorAvailabilityEditorStateSchema,
   listBookableSlotsSchema,
   reservePrivateLessonSessionSchema,
} from "@/app/private-lessons/schema";
import {
   availabilityForRange,
   EMPTY_WEEKLY_HOURS,
   type AvailabilityOccurrence,
} from "@/lib/availability";
import {
   addDays,
   startOfWeekMonday,
   todayInTimeZone,
} from "@/lib/availability-editor";
import {
   generateBookableSlots,
   isStaleHold,
   NEXT_AVAILABLE_SEARCH_DAYS,
   rangeBounds,
   type BookableSlot,
   type BusyInterval,
} from "@/lib/booking-slots";
import { ROLES } from "@/lib/roles";

import { and, asc, eq, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
   coordinatorAvailabilityHours,
   coordinatorAvailabilityOverrides,
   privateLessonSessions,
   profiles,
   services,
   type AvailabilityOverrideWindow,
   type CoordinatorWeeklyHours,
} from "@/lib/db/schema";
import { createClient } from "@/utils/supabase/server";

type Executor = Pick<typeof db, "select">;

const MAX_LESSON_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = "America/Toronto";

type SchedulableService = {
   id: string;
   coordinatorId: string;
   durationMinutes: number;
   isScheduled: boolean;
};

async function loadPrivateLesson(
   serviceId: string,
): Promise<SchedulableService | { error: string }> {
   const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
   });
   if (!service) return { error: "Service not found" };
   if (service.status !== "active")
      return { error: "Service is not available" };
   if (service.type !== "private_lessons")
      return { error: "Service is not a private lesson" };
   if (!service.coordinatorId)
      return { error: "Service has no coordinator assigned" };
   return {
      id: service.id,
      coordinatorId: service.coordinatorId,
      durationMinutes: service.durationMinutes,
      isScheduled: service.isScheduled,
   };
}

async function loadWeeklyHours(executor: Executor, coordinatorId: string) {
   const [row] = await executor
      .select()
      .from(coordinatorAvailabilityHours)
      .where(eq(coordinatorAvailabilityHours.coordinatorId, coordinatorId))
      .limit(1);
   return {
      hours: row?.hours ?? EMPTY_WEEKLY_HOURS,
      timezone: row?.timezone ?? DEFAULT_TIMEZONE,
   };
}

async function loadBusyIntervals(
   executor: Executor,
   coordinatorId: string,
   bounds: { start: Date; end: Date },
   now: Date,
): Promise<BusyInterval[]> {
   const rows = await executor
      .select({
         scheduledAt: privateLessonSessions.scheduledAt,
         status: privateLessonSessions.status,
         createdAt: privateLessonSessions.createdAt,
         durationMinutes: services.durationMinutes,
      })
      .from(privateLessonSessions)
      .innerJoin(services, eq(services.id, privateLessonSessions.serviceId))
      .where(
         and(
            eq(privateLessonSessions.coordinatorId, coordinatorId),
            isNotNull(privateLessonSessions.scheduledAt),
            inArray(privateLessonSessions.status, [
               "awaiting_payment",
               "pending",
               "confirmed",
               "completed",
            ]),
            gte(
               privateLessonSessions.scheduledAt,
               new Date(bounds.start.getTime() - MAX_LESSON_MS),
            ),
            lt(privateLessonSessions.scheduledAt, bounds.end),
         ),
      );

   return rows
      .filter(
         (row) =>
            row.scheduledAt &&
            !(
               row.status === "awaiting_payment" &&
               isStaleHold(row.createdAt, now)
            ),
      )
      .map((row) => ({
         start: row.scheduledAt!,
         end: new Date(
            row.scheduledAt!.getTime() + row.durationMinutes * 60_000,
         ),
      }));
}

async function computeSlots(
   executor: Executor,
   {
      service,
      hours,
      timezone,
      from,
      to,
      now,
      ignoreBookings = false,
   }: {
      service: SchedulableService;
      hours: CoordinatorWeeklyHours;
      timezone: string;
      from: string;
      to: string;
      now: Date;
      ignoreBookings?: boolean;
   },
): Promise<BookableSlot[]> {
   const overrideRows = await executor
      .select({
         date: coordinatorAvailabilityOverrides.date,
         windows: coordinatorAvailabilityOverrides.windows,
      })
      .from(coordinatorAvailabilityOverrides)
      .where(
         and(
            eq(
               coordinatorAvailabilityOverrides.coordinatorId,
               service.coordinatorId,
            ),
            gte(coordinatorAvailabilityOverrides.date, from),
            lte(coordinatorAvailabilityOverrides.date, to),
         ),
      );
   const overrides: Record<string, AvailabilityOverrideWindow[]> = {};
   for (const row of overrideRows) overrides[row.date] = row.windows;

   const busy = ignoreBookings
      ? []
      : await loadBusyIntervals(
           executor,
           service.coordinatorId,
           rangeBounds(from, to, timezone),
           now,
        );

   return generateBookableSlots({
      occurrences: availabilityForRange({ hours, overrides, from, to }),
      timeZone: timezone,
      durationMinutes: service.durationMinutes,
      busy,
      now,
   });
}

export type ListBookableSlotsResult =
   | {
        timezone: string;
        from: string;
        to: string;
        today: string;
        slots: BookableSlot[];
        nextAvailableDate: string | null;
     }
   | { error: string };

export async function listBookableSlots(
   input: unknown,
): Promise<ListBookableSlotsResult> {
   const parsed = listBookableSlotsSchema.safeParse(input);
   if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
   }

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const service = await loadPrivateLesson(parsed.data.serviceId);
   if ("error" in service) return service;
   if (!service.isScheduled)
      return { error: "This lesson is not booked at a set time" };

   const now = new Date();
   const { hours, timezone } = await loadWeeklyHours(db, service.coordinatorId);
   const today = todayInTimeZone(timezone, now);
   const from = parsed.data.from ?? startOfWeekMonday(today);
   const to = parsed.data.to ?? addDays(from, 6);

   const slots = await computeSlots(db, {
      service,
      hours,
      timezone,
      from,
      to,
      now,
   });

   let nextAvailableDate: string | null = null;
   if (slots.length === 0) {
      const searchFrom = addDays(to, 1) > today ? addDays(to, 1) : today;
      const upcoming = await computeSlots(db, {
         service,
         hours,
         timezone,
         from: searchFrom,
         to: addDays(searchFrom, NEXT_AVAILABLE_SEARCH_DAYS),
         now,
      });
      nextAvailableDate = upcoming[0]?.date ?? null;
   }

   return { timezone, from, to, today, slots, nextAvailableDate };
}

export type ReservePrivateLessonSessionResult =
   | { privateLessonSessionId: string }
   | { error: string; code?: "slot_required" | "slot_taken" | "invalid_slot" };

export async function reservePrivateLessonSession(
   input: unknown,
): Promise<ReservePrivateLessonSessionResult> {
   const parsed = reservePrivateLessonSessionSchema.safeParse(input);
   if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
   }

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const service = await loadPrivateLesson(parsed.data.serviceId);
   if ("error" in service) return service;

   if (!service.isScheduled) {
      const [row] = await db
         .insert(privateLessonSessions)
         .values({
            userId: user.id,
            serviceId: service.id,
            coordinatorId: service.coordinatorId,
            selectedTimeSlots: null,
            status: "awaiting_payment",
         })
         .returning({ id: privateLessonSessions.id });
      return { privateLessonSessionId: row.id };
   }

   const { slotStart } = parsed.data;
   if (!slotStart) {
      return { error: "Pick a time for your lesson", code: "slot_required" };
   }
   const requested = new Date(slotStart).toISOString();

   return db.transaction(async (tx) => {
      // Serialize bookings per coordinator for the rest of the transaction.
      await tx
         .select({ id: profiles.id })
         .from(profiles)
         .where(eq(profiles.id, service.coordinatorId))
         .for("update");

      const now = new Date();
      const { hours, timezone } = await loadWeeklyHours(
         tx,
         service.coordinatorId,
      );
      const date = todayInTimeZone(timezone, new Date(requested));
      const range = {
         service,
         hours,
         timezone,
         from: addDays(date, -1),
         to: addDays(date, 1),
         now,
      };

      const open = await computeSlots(tx, range);
      const slot = open.find((candidate) => candidate.start === requested);
      if (!slot) {
         const offered = await computeSlots(tx, {
            ...range,
            ignoreBookings: true,
         });
         return offered.some((candidate) => candidate.start === requested)
            ? {
                 error: "That time was just booked. Please pick another time.",
                 code: "slot_taken" as const,
              }
            : {
                 error: "That time isn't available. Please pick another time.",
                 code: "invalid_slot" as const,
              };
      }

      const [row] = await tx
         .insert(privateLessonSessions)
         .values({
            userId: user.id,
            serviceId: service.id,
            coordinatorId: service.coordinatorId,
            scheduledAt: new Date(slot.start),
            selectedTimeSlots: null,
            status: "awaiting_payment",
         })
         .returning({ id: privateLessonSessions.id });
      return { privateLessonSessionId: row.id };
   });
}

async function authorizeCoordinatorAvailability(
   coordinatorId: string,
): Promise<{ error: string } | null> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Unauthorized" };

   const { data } = await supabase.auth.getClaims();
   const role = data?.claims?.user_role;

   if (role === ROLES.COORDINATOR && user.id === coordinatorId) return null;
   if (role !== ROLES.ADMIN) return { error: "Unauthorized" };

   const coordinator = await db.query.profiles.findFirst({
      where: eq(profiles.id, coordinatorId),
      columns: { role: true },
   });
   if (coordinator?.role !== ROLES.COORDINATOR) {
      return { error: "Coordinator not found" };
   }
   return null;
}

export type SaveCoordinatorWeeklyHoursResult = { ok: true } | { error: string };

export async function saveCoordinatorWeeklyHours(
   input: unknown,
): Promise<SaveCoordinatorWeeklyHoursResult> {
   const parsed = saveCoordinatorWeeklyHoursSchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, timezone, hours } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   await db
      .insert(coordinatorAvailabilityHours)
      .values({ coordinatorId, timezone, hours })
      .onConflictDoUpdate({
         target: coordinatorAvailabilityHours.coordinatorId,
         set: { timezone, hours, updatedAt: new Date() },
      });

   return { ok: true };
}

export type SetCoordinatorAvailabilityOverrideResult =
   | { ok: true }
   | { error: string };

export async function setCoordinatorAvailabilityOverride(
   input: unknown,
): Promise<SetCoordinatorAvailabilityOverrideResult> {
   const parsed = setCoordinatorAvailabilityOverrideSchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, date, windows } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   await db
      .insert(coordinatorAvailabilityOverrides)
      .values({ coordinatorId, date, windows })
      .onConflictDoUpdate({
         target: [
            coordinatorAvailabilityOverrides.coordinatorId,
            coordinatorAvailabilityOverrides.date,
         ],
         set: { windows, updatedAt: new Date() },
      });

   return { ok: true };
}

export type ClearCoordinatorAvailabilityOverrideResult =
   | { ok: true }
   | { error: string };

export async function clearCoordinatorAvailabilityOverride(
   input: unknown,
): Promise<ClearCoordinatorAvailabilityOverrideResult> {
   const parsed = clearCoordinatorAvailabilityOverrideSchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, date } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   await db
      .delete(coordinatorAvailabilityOverrides)
      .where(
         and(
            eq(coordinatorAvailabilityOverrides.coordinatorId, coordinatorId),
            eq(coordinatorAvailabilityOverrides.date, date),
         ),
      );

   return { ok: true };
}

export type FetchCoordinatorAvailabilityEditorStateResult =
   | {
        hours: CoordinatorWeeklyHours;
        timezone: string;
        /** null = no override row for that date; [] = explicit day off */
        override: AvailabilityOverrideWindow[] | null;
     }
   | { error: string };

export async function fetchCoordinatorAvailabilityEditorState(
   input: unknown,
): Promise<FetchCoordinatorAvailabilityEditorStateResult> {
   const parsed =
      fetchCoordinatorAvailabilityEditorStateSchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, overrideDate } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   const [hoursRow] = await db
      .select()
      .from(coordinatorAvailabilityHours)
      .where(eq(coordinatorAvailabilityHours.coordinatorId, coordinatorId))
      .limit(1);

   let override: AvailabilityOverrideWindow[] | null = null;
   if (overrideDate) {
      const [overrideRow] = await db
         .select()
         .from(coordinatorAvailabilityOverrides)
         .where(
            and(
               eq(
                  coordinatorAvailabilityOverrides.coordinatorId,
                  coordinatorId,
               ),
               eq(coordinatorAvailabilityOverrides.date, overrideDate),
            ),
         )
         .limit(1);
      override = overrideRow ? overrideRow.windows : null;
   }

   return {
      hours: hoursRow?.hours ?? EMPTY_WEEKLY_HOURS,
      timezone: hoursRow?.timezone ?? "America/Toronto",
      override,
   };
}

export type CoordinatorAvailabilityOverride = {
   date: string;
   windows: AvailabilityOverrideWindow[];
};

export type ListCoordinatorAvailabilityOverridesResult =
   | { overrides: CoordinatorAvailabilityOverride[] }
   | { error: string };

export async function listCoordinatorAvailabilityOverrides(
   input: unknown,
): Promise<ListCoordinatorAvailabilityOverridesResult> {
   const parsed = listCoordinatorAvailabilityOverridesSchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, from } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   const rows = await db
      .select({
         date: coordinatorAvailabilityOverrides.date,
         windows: coordinatorAvailabilityOverrides.windows,
      })
      .from(coordinatorAvailabilityOverrides)
      .where(
         and(
            eq(coordinatorAvailabilityOverrides.coordinatorId, coordinatorId),
            gte(coordinatorAvailabilityOverrides.date, from),
         ),
      )
      .orderBy(asc(coordinatorAvailabilityOverrides.date));

   return { overrides: rows };
}

export type ListCoordinatorAvailabilityResult =
   | {
        occurrences: AvailabilityOccurrence[];
        timezone: string;
     }
   | { error: string };

export async function listCoordinatorAvailability(
   input: unknown,
): Promise<ListCoordinatorAvailabilityResult> {
   const parsed = listCoordinatorAvailabilitySchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, from, to } = parsed.data;
   const denied = await authorizeCoordinatorAvailability(coordinatorId);
   if (denied) return denied;

   const [hoursRow] = await db
      .select()
      .from(coordinatorAvailabilityHours)
      .where(eq(coordinatorAvailabilityHours.coordinatorId, coordinatorId))
      .limit(1);

   const overrideRows = await db
      .select()
      .from(coordinatorAvailabilityOverrides)
      .where(
         and(
            eq(coordinatorAvailabilityOverrides.coordinatorId, coordinatorId),
            gte(coordinatorAvailabilityOverrides.date, from),
            lte(coordinatorAvailabilityOverrides.date, to),
         ),
      );

   const overrides: Record<string, AvailabilityOverrideWindow[]> = {};
   for (const row of overrideRows) {
      overrides[row.date] = row.windows;
   }

   return {
      occurrences: availabilityForRange({
         hours: hoursRow?.hours ?? EMPTY_WEEKLY_HOURS,
         overrides,
         from,
         to,
      }),
      timezone: hoursRow?.timezone ?? "America/Toronto",
   };
}
