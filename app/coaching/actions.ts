"use server";
import { updateCoordinatorAvailabilitySchema } from "@/app/coaching/schema";
import { ROLES } from "@/lib/roles"

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
   coachingSessions,
   coordinatorAvailability,
   services,
} from "@/lib/db/schema";
import { createClient } from "@/utils/supabase/server";
import { Schema } from "zod";

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


async function canEditCoordinatorAvailability(
   coordinatorId: string,
): Promise<boolean> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return false;

   const { data } = await supabase.auth.getClaims();
   const role = data?.claims?.user_role;

   if (role === ROLES.ADMIN) return true;
   if (role === ROLES.COORDINATOR && user.id === coordinatorId) return true;
   return false;
}

export type UpdateCoordinatorAvailabilityResult =
   | { ok: true }
   | { error: string };

export async function updateCoordinatorAvailability(
   input: unknown,
): Promise<UpdateCoordinatorAvailabilityResult> {
   const parsed = updateCoordinatorAvailabilitySchema.safeParse(input);
   if (!parsed.success) {
      return {
         error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
   }

   const { coordinatorId, slots } = parsed.data;
   if (!(await canEditCoordinatorAvailability(coordinatorId))) {
      return { error: "Unauthorized" };
   }

   await db
      .insert(coordinatorAvailability)
      .values({ coordinatorId, slots })
      .onConflictDoUpdate({
         target: coordinatorAvailability.coordinatorId,
         set: { slots, updatedAt: new Date() },
      });

   return { ok: true };
}