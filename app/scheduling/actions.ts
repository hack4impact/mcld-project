"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { createClient } from "@/utils/supabase/server";

export type TimeSlot = { start: string; end: string };

export type SchedulingActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const iso8601 = z.string().datetime({ message: "Must be an ISO 8601 datetime" });

const timeSlotSchema = z
   .object({
      start: iso8601,
      end: iso8601,
   })
   .refine((slot) => new Date(slot.end) > new Date(slot.start), {
      message: "End time must be after start time",
   });

const selectAvailabilitiesSchema = z.object({
   session_id: z.string().uuid("Invalid session ID"),
   time_slots: z
      .array(timeSlotSchema)
      .min(1, "At least one time slot is required"),
});

const selectTimeSlotSchema = z.object({
   session_id: z.string().uuid("Invalid session ID"),
   start: iso8601,
   end: iso8601,
});

async function getAuthenticatedUserId(): Promise<string | null> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   return user?.id ?? null;
}

/**
 * Fetch a coaching session and verify the caller is either the coach or user.
 * Returns the session row or an error state.
 */
async function getAuthorizedSession(
   sessionId: string,
   userId: string,
): Promise<
   | { ok: true; session: typeof coachingSessions.$inferSelect }
   | { ok: false; state: SchedulingActionState }
> {
   const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.id, sessionId))
      .limit(1);

   if (!session) {
      return {
         ok: false,
         state: { errors: { _form: ["Coaching session not found"] } },
      };
   }

   if (session.coachId !== userId && session.userId !== userId) {
      return {
         ok: false,
         state: { errors: { _form: ["You are not authorized to modify this session"] } },
      };
   }

   return { ok: true, session };
}

/**
 * Set (or replace) the available time slots on an existing coaching session.
 *
 * Both the assigned coach and the session user can call this action.
 * The payload is an array of `{ start, end }` ISO 8601 strings.
 */
export async function selectAvailabilities(
   _prev: SchedulingActionState,
   formData: FormData,
): Promise<SchedulingActionState> {
   // 1. Auth gate
   const callerId = await getAuthenticatedUserId();
   if (!callerId) {
      return { errors: { _form: ["You must be logged in"] } };
   }

   // 2. Parse & validate input
   let sessionId: string;
   let timeSlots: TimeSlot[];
   try {
      const rawSlots = formData.get("time_slots")?.toString() ?? "";
      const parsed = selectAvailabilitiesSchema.safeParse({
         session_id: formData.get("session_id")?.toString(),
         time_slots: JSON.parse(rawSlots),
      });

      if (!parsed.success) {
         return { errors: parsed.error.flatten().fieldErrors };
      }

      sessionId = parsed.data.session_id;
      timeSlots = parsed.data.time_slots as TimeSlot[];
   } catch {
      return { errors: { time_slots: ["Invalid time slots format"] } };
   }

   // 3. Authorization: caller must be the coach or user on this session
   const result = await getAuthorizedSession(sessionId, callerId);
   if (!result.ok) {
      return result.state;
   }

   // 4. Update the session
   try {
      await db
         .update(coachingSessions)
         .set({
            selectedTimeSlots: timeSlots,
            updatedAt: new Date(),
         })
         .where(eq(coachingSessions.id, sessionId));
   } catch (e) {
      console.error(e);
      return {
         errors: {
            _form: [
               e instanceof Error
                  ? e.message
                  : "Could not update availabilities",
            ],
         },
      };
   }

   return { message: "Availabilities updated." };
}

/**
 * Select a confirmed time slot for an existing coaching session.
 *
 * The chosen `{ start, end }` must be one of the `selected_time_slots`
 * already stored on the session. On success, `scheduled_at` is set to the
 * slot's start time and the session status becomes `confirmed`.
 */
export async function selectTimeSlot(
   _prev: SchedulingActionState,
   formData: FormData,
): Promise<SchedulingActionState> {
   // 1. Auth gate
   const callerId = await getAuthenticatedUserId();
   if (!callerId) {
      return { errors: { _form: ["You must be logged in"] } };
   }

   // 2. Parse & validate input
   const parsed = selectTimeSlotSchema.safeParse({
      session_id: formData.get("session_id")?.toString(),
      start: formData.get("start")?.toString(),
      end: formData.get("end")?.toString(),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { session_id, start, end } = parsed.data;

   // 3. Authorization
   const result = await getAuthorizedSession(session_id, callerId);
   if (!result.ok) {
      return result.state;
   }

   const { session } = result;

   // 4. Verify the slot exists in the session's available time slots
   const slots = session.selectedTimeSlots as TimeSlot[] | null;
   if (!slots || !Array.isArray(slots)) {
      return {
         errors: {
            _form: ["No available time slots have been set for this session"],
         },
      };
   }

   const matchingSlot = slots.find(
      (s) => s.start === start && s.end === end,
   );
   if (!matchingSlot) {
      return {
         errors: {
            _form: [
               "The selected time slot is not among the available options",
            ],
         },
      };
   }

   // 5. Confirm the session with the chosen slot
   try {
      await db
         .update(coachingSessions)
         .set({
            scheduledAt: new Date(start),
            status: "confirmed",
            updatedAt: new Date(),
         })
         .where(eq(coachingSessions.id, session_id));
   } catch (e) {
      console.error(e);
      return {
         errors: {
            _form: [
               e instanceof Error
                  ? e.message
                  : "Could not confirm the time slot",
            ],
         },
      };
   }

   return { message: "Time slot confirmed." };
}
