import "server-only";

import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, services } from "@/lib/db/schema";
import {
   formatPrice,
   getStripeCatalogDetails,
} from "@/lib/services/stripe-catalog";
import {
   PAGE_SIZE,
   type ServiceListItem,
   type ServiceStatus,
   type ServiceStatusFilter,
   type ServiceType,
} from "@/lib/services/service-types";

export type {
   ServiceListItem,
   ServiceStatus,
   ServiceStatusFilter,
   ServiceType,
} from "@/lib/services/service-types";
export { PAGE_SIZE, parseStatusFilter } from "@/lib/services/service-types";

function statusCondition(filter: ServiceStatusFilter) {
   switch (filter) {
      case "active":
         return eq(services.status, "active");
      case "disabled":
         return eq(services.status, "disabled");
      case "archived":
         return eq(services.status, "archived");
      default:
         return ne(services.status, "deleted");
   }
}

export async function listServices(input: {
   type: ServiceType;
   statusFilter: ServiceStatusFilter;
   page: number;
}) {
   const page = Math.max(1, input.page);
   const offset = (page - 1) * PAGE_SIZE;

   const where = and(eq(services.type, input.type), statusCondition(input.statusFilter));

   const [rows, totalResult] = await Promise.all([
      db
         .select()
         .from(services)
         .where(where)
         .orderBy(desc(services.createdAt))
         .limit(PAGE_SIZE)
         .offset(offset),
      db.select({ value: count() }).from(services).where(where),
   ]);

   const total = totalResult[0]?.value ?? 0;

   const items: ServiceListItem[] = await Promise.all(
      rows.map(async (row) => {
         const catalog = await getStripeCatalogDetails(row.stripeProductId);
         return {
            id: row.id,
            type: row.type as ServiceType,
            status: row.status as ServiceStatus,
            durationMinutes: row.durationMinutes,
            startDate: row.startDate,
            endDate: row.endDate,
            coachId: row.coachId,
            stripeProductId: row.stripeProductId,
            catalog,
            priceLabel: formatPrice(catalog.priceCents, catalog.currency),
         };
      }),
   );

   return {
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
   };
}

export async function getServiceById(id: string) {
   const row = await db.query.services.findFirst({
      where: eq(services.id, id),
   });

   if (!row) {
      return null;
   }

   const catalog = await getStripeCatalogDetails(row.stripeProductId);

   return { row, catalog };
}

export async function listCoaches() {
   return db
      .select({
         id: profiles.id,
         firstName: profiles.firstName,
         lastName: profiles.lastName,
      })
      .from(profiles)
      .where(eq(profiles.role, "coach"));
}
