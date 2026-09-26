"use server";
import {
   saveCoordinatorWeeklyHoursSchema,
   setCoordinatorAvailabilityOverrideSchema,
   clearCoordinatorAvailabilityOverrideSchema,
   listCoordinatorAvailabilitySchema,
   fetchCoordinatorAvailabilityEditorStateSchema,
} from "@/app/coaching/schema";
import {
   availabilityForRange,
   EMPTY_WEEKLY_HOURS,
   type AvailabilityOccurrence,
} from "@/lib/availability";
import { ROLES } from "@/lib/roles";

import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
   coachingSessions,
   coordinatorAvailabilityHours,
   coordinatorAvailabilityOverrides,
   profiles,
   services,
   type AvailabilityOverrideWindow,
   type CoordinatorWeeklyHours,
} from "@/lib/db/schema";
import { createClient } from "@/utils/supabase/server";

export type Availability = { start: string; end: string };

export type SubmitAvailabilitiesResult =
   | { coachingSessionId: string }
   | { error: string };

export async function submitAvailabilities({
   serviceId,
   availabilities,
}: {
   serviceId: string;
   availabilities: Availability[];
}): Promise<SubmitAvailabilitiesResult> {
   if (!availabilities?.length)
      return { error: "At least one availability window is required" };

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

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
   // Not checked here: this session is always immediately paid for via
   // checkoutCoachingSession (see startPrivateLessonCheckout), which
   // re-fetches this same service and enforces the subscription
   // requirement before creating a Stripe session or leaving this row
   // in place.

   const [row] = await db
      .insert(coachingSessions)
      .values({
         userId: user.id,
         serviceId: service.id,
         coordinatorId: service.coordinatorId,
         selectedTimeSlots: availabilities,
         status: "awaiting_payment",
      })
      .returning({ id: coachingSessions.id });

   return { coachingSessionId: row.id };
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
