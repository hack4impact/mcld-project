"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { intersectTimeSlots, isBookableSlot } from "@/lib/scheduling/overlap";
import { getService } from "@/app/(authenticated)/services/queries";
import type { TimeSlot } from "@/lib/scheduling/time-slot";

import { notifyBothConfirmed, notifyClientToPick } from "./notifications";

const iso8601 = z
   .string()
   .datetime({ offset: true, message: "Must be an ISO 8601 datetime" });

const slotSchema = z
   .object({ start: iso8601, end: iso8601 })
   .refine((s) => new Date(s.end) > new Date(s.start), {
      message: "End must be after start",
   });

const submitSchema = z.object({
   token: z.string().min(1),
   slots: z.array(slotSchema).min(1, "Select at least one availability window"),
});

const confirmSchema = z.object({
   token: z.string().min(1),
   slot: slotSchema,
});

export type CoachSubmitResult =
   | { ok: true; overlapCount: number }
   | { ok: false; error: string };

export type ConfirmResult = { ok: true } | { ok: false; error: string };

function normalize(slot: TimeSlot): TimeSlot {
   return {
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
   };
}

export async function submitCoachAvailabilities(
   input: z.input<typeof submitSchema>,
): Promise<CoachSubmitResult> {
   const parsed = submitSchema.safeParse(input);
   if (!parsed.success) {
      return {
         ok: false,
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }
   const { token } = parsed.data;
   const slots = parsed.data.slots.map(normalize);

   const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.coachToken, token))
      .limit(1);

   if (!session)
      return { ok: false, error: "This scheduling link is invalid." };
   if (session.status !== "pending") {
      return {
         ok: false,
         error: "This session can no longer be edited.",
      };
   }

   const overlap = intersectTimeSlots(
      (session.selectedTimeSlots as TimeSlot[]) ?? [],
      slots,
   );
   if (overlap.length === 0) {
      return {
         ok: false,
         error: "None of your times overlap with the client's availability. Pick at least one window that matches theirs.",
      };
   }

   try {
      const updated = await db
         .update(coachingSessions)
         .set({
            coachTimeSlots: slots,
            coachToken: null,
            updatedAt: new Date(),
         })
         .where(
            and(
               eq(coachingSessions.id, session.id),
               eq(coachingSessions.coachToken, token),
            ),
         )
         .returning({ id: coachingSessions.id });

      if (updated.length === 0) {
         return {
            ok: false,
            error: "Your availability has already been submitted.",
         };
      }
   } catch (e) {
      console.error("[submitCoachAvailabilities]", e);
      return { ok: false, error: "Could not save your availability." };
   }

   await notifyClientToPick(session.id);
   return { ok: true, overlapCount: overlap.length };
}

export async function confirmFinalSlot(
   input: z.input<typeof confirmSchema>,
): Promise<ConfirmResult> {
   const parsed = confirmSchema.safeParse(input);
   if (!parsed.success) {
      return {
         ok: false,
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }
   const { token } = parsed.data;
   const slot = normalize(parsed.data.slot);

   const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.clientToken, token))
      .limit(1);

   if (!session)
      return { ok: false, error: "This scheduling link is invalid." };
   if (session.status !== "pending") {
      return { ok: false, error: "This session has already been confirmed." };
   }

   const overlap = intersectTimeSlots(
      (session.selectedTimeSlots as TimeSlot[]) ?? [],
      (session.coachTimeSlots as TimeSlot[] | null) ?? [],
   );
   const service = await getService(session.serviceId);
   const durationMinutes = service?.durationMinutes ?? 60;
   if (!isBookableSlot(slot, overlap, durationMinutes)) {
      return {
         ok: false,
         error: "That time isn't one of the available options.",
      };
   }

   try {
      const updated = await db
         .update(coachingSessions)
         .set({
            scheduledAt: new Date(slot.start),
            status: "confirmed",
            updatedAt: new Date(),
         })
         .where(
            and(
               eq(coachingSessions.id, session.id),
               eq(coachingSessions.status, "pending"),
            ),
         )
         .returning({ id: coachingSessions.id });

      if (updated.length === 0) {
         return {
            ok: false,
            error: "This session is no longer available for confirmation.",
         };
      }
   } catch (e) {
      console.error("[confirmFinalSlot]", e);
      return { ok: false, error: "Could not confirm your time slot." };
   }

   await notifyBothConfirmed(session.id, slot);
   return { ok: true };
}
