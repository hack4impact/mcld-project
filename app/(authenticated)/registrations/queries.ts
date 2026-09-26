import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
   children,
   coachingSessions,
   serviceBookings,
   services,
} from "@/lib/db/schema";
import { getStripeServiceData } from "@/lib/stripe";
import {
   buildRegistrations,
   type Registrations,
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
   const [bookings, sessions] = await Promise.all([
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
            id: coachingSessions.id,
            status: coachingSessions.status,
            scheduledAt: coachingSessions.scheduledAt,
            createdAt: coachingSessions.createdAt,
            service: services,
            child: children,
         })
         .from(coachingSessions)
         .innerJoin(services, eq(services.id, coachingSessions.serviceId))
         .leftJoin(children, eq(children.id, coachingSessions.childId))
         .where(
            and(
               eq(coachingSessions.userId, userId),
               inArray(coachingSessions.status, [
                  "pending",
                  "confirmed",
                  "completed",
               ]),
            ),
         ),
   ]);

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

   return buildRegistrations({ bookings, sessions, titles, now: new Date() });
}
