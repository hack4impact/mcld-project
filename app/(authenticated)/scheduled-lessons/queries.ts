import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

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
   coordinatorName: string;
   scheduledAt: Date | null;
   meetingUrl: string | null;
   selectedTimeSlots: TimeSlot[];
   status: string;
};

async function fetchServiceTitle(productId: string): Promise<string | null> {
   try {
      return (await getStripeServiceData(productId))?.title ?? null;
   } catch (error) {
      console.error("[scheduled-lessons] Stripe lookup failed", {
         productId,
         error,
      });
      return null;
   }
}

export async function listUpcomingLessons({
   coordinatorId,
   now = new Date(),
}: {
   coordinatorId?: string;
   now?: Date;
} = {}): Promise<ScheduledLessonView[]> {
   if (coordinatorId !== undefined && !UUID_RE.test(coordinatorId)) return [];

   const client = alias(profiles, "client");
   const coordinator = alias(profiles, "coordinator");

   const rows = await db
      .select({
         id: privateLessonSessions.id,
         scheduledAt: privateLessonSessions.scheduledAt,
         meetingUrl: privateLessonSessions.meetingUrl,
         selectedTimeSlots: privateLessonSessions.selectedTimeSlots,
         status: privateLessonSessions.status,
         stripeProductId: services.stripeProductId,
         clientFirstName: client.firstName,
         clientLastName: client.lastName,
         coordinatorFirstName: coordinator.firstName,
         coordinatorLastName: coordinator.lastName,
      })
      .from(privateLessonSessions)
      .innerJoin(services, eq(services.id, privateLessonSessions.serviceId))
      .innerJoin(client, eq(client.id, privateLessonSessions.userId))
      .innerJoin(
         coordinator,
         eq(coordinator.id, privateLessonSessions.coordinatorId),
      )
      .where(
         and(
            coordinatorId
               ? eq(privateLessonSessions.coordinatorId, coordinatorId)
               : undefined,
            inArray(privateLessonSessions.status, ["pending", "confirmed"]),
            or(
               isNull(privateLessonSessions.scheduledAt),
               gt(
                  sql`${privateLessonSessions.scheduledAt} + ${services.durationMinutes} * interval '1 minute'`,
                  // Raw SQL has no column encoder, so postgres-js can't bind a Date here.
                  now.toISOString(),
               ),
            ),
         ),
      )
      .orderBy(asc(privateLessonSessions.scheduledAt));

   const productIds = [...new Set(rows.map((r) => r.stripeProductId))];
   const titles = new Map(
      await Promise.all(
         productIds.map(
            async (id) => [id, await fetchServiceTitle(id)] as const,
         ),
      ),
   );

   return rows.map((r) => ({
      id: r.id,
      serviceTitle: titles.get(r.stripeProductId) ?? null,
      clientName: `${r.clientFirstName} ${r.clientLastName}`.trim(),
      coordinatorName:
         `${r.coordinatorFirstName} ${r.coordinatorLastName}`.trim(),
      scheduledAt: r.scheduledAt,
      meetingUrl: r.meetingUrl,
      selectedTimeSlots: (r.selectedTimeSlots as TimeSlot[] | null) ?? [],
      status: r.status,
   }));
}
