export type ServiceType = "programs" | "private_lessons";
export type ServiceStatus = "active" | "disabled" | "archived" | "deleted";

const STATUS_FILTERS = ["all", "active", "disabled", "archived"] as const;
export type ServiceStatusFilter = (typeof STATUS_FILTERS)[number];

export function parseStatusFilter(
   value: string | null | undefined,
): ServiceStatusFilter {
   if (value && STATUS_FILTERS.includes(value as ServiceStatusFilter)) {
      return value as ServiceStatusFilter;
   }
   return "all";
}

export type StripeCatalogDetails = {
   name: string;
   description: string;
   priceCents: number;
   currency: string;
};

export type ServiceListItem = {
   id: string;
   type: ServiceType;
   status: ServiceStatus;
   durationMinutes: number;
   startDate: string | null;
   endDate: string | null;
   coachId: string | null;
   stripeProductId: string;
   catalog: StripeCatalogDetails;
   priceLabel: string;
};

export const PAGE_SIZE = 10;
