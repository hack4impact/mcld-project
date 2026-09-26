import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
   children,
   privateLessonSessions,
   serviceBookings,
   services,
} from "@/lib/db/schema";
import {
   loadCashSessionRegistrations,
   withoutInvoiceDuplicates,
} from "@/lib/cash-session-read-model";
import { getStripeServiceData } from "@/lib/stripe";
import {
   buildRegistrations,
   type Registrations,
   type SessionRow,
} from "./build-registrations";

async function fetchServiceTitle(productId: string): Promise<string | null> {
   try {
      return (await getStripeServiceData(productId))?.title ?? null;
   } catch (error) {
      console.error("[listRegistrationsForUser] Stripe lookup failed", {
         productId,
         error,
      });
      return null;
   }
}

export async function listRegistrationsForUser(
   userId: string,
): Promise<Registrations> {
   const [bookings, sessions, cash] = await Promise.all([
      db
         .select({ service: services, child: children })
         .from(serviceBookings)
         .innerJoin(services, eq(services.id, serviceBookings.serviceId))
         .leftJoin(children, eq(children.id, serviceBookings.childId))
         .where(
            and(
               eq(serviceBookings.userId, userId),
               eq(serviceBookings.isActive, true),
               inArray(serviceBookings.status, ["pending", "confirmed"]),
            ),
         ),
      db
         .select({
            id: privateLessonSessions.id,
            status: privateLessonSessions.status,
            scheduledAt: privateLessonSessions.scheduledAt,
            createdAt: privateLessonSessions.createdAt,
            stripeOrderId: privateLessonSessions.stripeOrderId,
            service: services,
            child: children,
         })
         .from(privateLessonSessions)
         .innerJoin(services, eq(services.id, privateLessonSessions.serviceId))
         .leftJoin(children, eq(children.id, privateLessonSessions.childId))
         .where(
            and(
               eq(privateLessonSessions.userId, userId),
               inArray(privateLessonSessions.status, [
                  "pending",
                  "confirmed",
                  "completed",
               ]),
            ),
         ),
      loadCashSessionRegistrations({ userId }),
   ]);

   const mergedSessions: SessionRow[] = [
      ...withoutInvoiceDuplicates(sessions, cash),
      ...cash.map(
         (record): SessionRow => ({
            id: record.invoiceId,
            status: "completed",
            scheduledAt: record.sessionAt,
            createdAt: record.createdAt,
            stripeOrderId: record.invoiceId,
            durationMinutes: record.durationMinutes,
            title: record.title,
            service: record.service,
            child: record.child,
         }),
      ),
   ];

   const productIds = new Map<string, string>();
   for (const { service } of [...bookings, ...sessions]) {
      productIds.set(service.id, service.stripeProductId);
   }
   const titles = new Map(
      await Promise.all(
         Array.from(productIds, async ([serviceId, productId]) => {
            return [serviceId, await fetchServiceTitle(productId)] as const;
         }),
      ),
   );

   return buildRegistrations({
      bookings,
      sessions: mergedSessions,
      titles,
      now: new Date(),
   });
}
