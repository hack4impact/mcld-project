import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
   privateLessonSessions,
   profiles,
   services,
} from "@/lib/db/schema";
import { getStripeServiceData } from "@/lib/stripe";
import type { TimeSlot } from "@/lib/scheduling/time-slot";

const UUID_RE =
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScheduledLessonView = {
   id: string;
   serviceTitle: string | null;
   clientName: string;
   scheduledAt: Date | null;
   meetingUrl: string | null;
   selectedTimeSlots: TimeSlot[];
   status: string;
};

/**
 * Upcoming private-lesson sessions a coordinator is responsible for: sessions
 * that are still pending or confirmed (not cancelled/completed), ordered by
 * scheduled time. Includes the service title and the client's name.
 */
export async function listUpcomingLessonsForCoordinator(
   coordinatorId: string,
): Promise<ScheduledLessonView[]> {
   if (!UUID_RE.test(coordinatorId)) return [];

   const rows = await db
      .select({
         id: privateLessonSessions.id,
         scheduledAt: privateLessonSessions.scheduledAt,
         meetingUrl: privateLessonSessions.meetingUrl,
         selectedTimeSlots: privateLessonSessions.selectedTimeSlots,
         status: privateLessonSessions.status,
         stripeProductId: services.stripeProductId,
         clientFirstName: profiles.firstName,
         clientLastName: profiles.lastName,
      })
      .from(privateLessonSessions)
      .innerJoin(services, eq(services.id, privateLessonSessions.serviceId))
      .innerJoin(profiles, eq(profiles.id, privateLessonSessions.userId))
      .where(
         and(
            eq(privateLessonSessions.coordinatorId, coordinatorId),
            inArray(privateLessonSessions.status, ["pending", "confirmed"]),
         ),
      )
      .orderBy(asc(privateLessonSessions.scheduledAt));

   return Promise.all(
      rows.map(async (r) => {
         const stripeData = await getStripeServiceData(r.stripeProductId);
         return {
            id: r.id,
            serviceTitle: stripeData?.title ?? null,
            clientName: `${r.clientFirstName} ${r.clientLastName}`.trim(),
            scheduledAt: r.scheduledAt,
            meetingUrl: r.meetingUrl,
            selectedTimeSlots:
               (r.selectedTimeSlots as TimeSlot[] | null) ?? [],
            status: r.status,
         };
      }),
   );
}
