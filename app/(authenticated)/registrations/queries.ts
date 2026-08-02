import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
   children,
   coachingSessions,
   serviceBookings,
   services,
} from "@/lib/db/schema";
import { getStripeServiceData } from "@/lib/stripe";
import type { ProgramSchedule } from "@/app/(authenticated)/services/actions";

export type RegisteredChild = {
   id: string;
   firstName: string;
   lastName: string;
};

export type RegistrationView = {
   serviceId: string;
   type: "programs" | "private_lessons";
   isForChildren: boolean;
   title: string | null;
   schedule: ProgramSchedule | null;
   durationMinutes: number;
   children: RegisteredChild[];
};

type ServiceGroup = {
   service: typeof services.$inferSelect;
   childRows: (typeof children.$inferSelect)[];
};

function scheduleFromService(
   row: typeof services.$inferSelect,
): ProgramSchedule | null {
   if (!row.startDate || !row.endDate) return null;
   return {
      startDate: row.startDate,
      endDate: row.endDate,
      slots: row.slots ?? [],
   };
}

function upsertGroup(
   groups: Map<string, ServiceGroup>,
   service: typeof services.$inferSelect,
   child: typeof children.$inferSelect | null,
) {
   let group = groups.get(service.id);
   if (!group) {
      group = { service, childRows: [] };
      groups.set(service.id, group);
   }
   if (child && !group.childRows.some((c) => c.id === child.id)) {
      group.childRows.push(child);
   }
}

export async function listRegistrationsForUser(
   userId: string,
): Promise<RegistrationView[]> {
   const [bookingRows, coachingRows] = await Promise.all([
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
         .select({ service: services, child: children })
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

   const groups = new Map<string, ServiceGroup>();
   for (const row of bookingRows) upsertGroup(groups, row.service, row.child);
   for (const row of coachingRows) upsertGroup(groups, row.service, row.child);

   const views = await Promise.all(
      Array.from(groups.values()).map(async ({ service, childRows }) => {
         const stripe = await getStripeServiceData(service.stripeProductId);
         return {
            serviceId: service.id,
            type: service.type,
            isForChildren: service.isForChildren,
            title: stripe?.title ?? null,
            schedule: scheduleFromService(service),
            durationMinutes: service.durationMinutes,
            children: childRows.map((c) => ({
               id: c.id,
               firstName: c.firstName,
               lastName: c.lastName,
            })),
         } satisfies RegistrationView;
      }),
   );

   return views.sort((a, b) => {
      const aStart = a.schedule?.startDate ?? "";
      const bStart = b.schedule?.startDate ?? "";
      if (aStart && bStart && aStart !== bStart)
         return bStart.localeCompare(aStart);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return (a.title ?? "").localeCompare(b.title ?? "");
   });
}
