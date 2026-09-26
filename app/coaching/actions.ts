"use server";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { coachingSessions, services } from "@/lib/db/schema";
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
