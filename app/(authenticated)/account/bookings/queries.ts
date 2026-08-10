import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
   children,
   coachingSessions,
   serviceBookings,
   services,
} from "@/lib/db/schema";
import { getStripeServiceData } from "@/lib/stripe";

export type AccountBooking = {
   id: string;
   kind: "service" | "private_lesson";
   title: string;
   status: string;
   bookedAt: Date;
   scheduledAt: Date | null;
   startDate: string | null;
   endDate: string | null;
   attendee: string | null;
};

async function resolveServiceTitles(
   productIds: string[],
): Promise<Map<string, string>> {
   const unique = [...new Set(productIds)];

   const entries = await Promise.all(
      unique.map(async (productId) => {
         try {
            const data = await getStripeServiceData(productId);
            return [productId, data?.title ?? "Service"] as const;
         } catch {
            return [productId, "Service"] as const;
         }
      }),
   );

   return new Map(entries);
}

export async function listBookingsForUser(
   userId: string,
): Promise<AccountBooking[]> {
   const [bookingRows, sessionRows] = await Promise.all([
      db
         .select({
            id: serviceBookings.id,
            status: serviceBookings.status,
            bookedAt: serviceBookings.createdAt,
            stripeProductId: services.stripeProductId,
            startDate: services.startDate,
            endDate: services.endDate,
            childFirstName: children.firstName,
            childLastName: children.lastName,
         })
         .from(serviceBookings)
         .innerJoin(services, eq(services.id, serviceBookings.serviceId))
         .leftJoin(children, eq(children.id, serviceBookings.childId))
         .where(
            and(
               eq(serviceBookings.userId, userId),
               ne(serviceBookings.status, "awaiting_payment"),
            ),
         )
         .orderBy(desc(serviceBookings.createdAt)),

      db
         .select({
            id: coachingSessions.id,
            status: coachingSessions.status,
            bookedAt: coachingSessions.createdAt,
            scheduledAt: coachingSessions.scheduledAt,
            stripeProductId: services.stripeProductId,
            childFirstName: children.firstName,
            childLastName: children.lastName,
         })
         .from(coachingSessions)
         .innerJoin(services, eq(services.id, coachingSessions.serviceId))
         .leftJoin(children, eq(children.id, coachingSessions.childId))
         .where(
            and(
               eq(coachingSessions.userId, userId),
               ne(coachingSessions.status, "awaiting_payment"),
            ),
         )
         .orderBy(desc(coachingSessions.createdAt)),
   ]);

   const titles = await resolveServiceTitles([
      ...bookingRows.map((r) => r.stripeProductId),
      ...sessionRows.map((r) => r.stripeProductId),
   ]);

   const attendeeName = (first: string | null, last: string | null) =>
      first && last ? `${first} ${last}` : null;

   const bookings: AccountBooking[] = [
      ...bookingRows.map((r) => ({
         id: r.id,
         kind: "service" as const,
         title: titles.get(r.stripeProductId) ?? "Service",
         status: r.status,
         bookedAt: r.bookedAt,
         scheduledAt: null,
         startDate: r.startDate,
         endDate: r.endDate,
         attendee: attendeeName(r.childFirstName, r.childLastName),
      })),
      ...sessionRows.map((r) => ({
         id: r.id,
         kind: "private_lesson" as const,
         title: titles.get(r.stripeProductId) ?? "Private lesson",
         status: r.status,
         bookedAt: r.bookedAt,
         scheduledAt: r.scheduledAt,
         startDate: null,
         endDate: null,
         attendee: attendeeName(r.childFirstName, r.childLastName),
      })),
   ];

   return bookings.sort((a, b) => b.bookedAt.getTime() - a.bookedAt.getTime());
}
