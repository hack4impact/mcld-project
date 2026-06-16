import { cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, services } from "@/lib/db/schema";
import { getStripeServiceData } from "@/lib/stripe";
import type { ProgramSchedule } from "@/app/(authenticated)/services/actions";

const SERVICES_TAG = "services";

const UUID_RE =
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COORDINATORS_TAG = "coordinators";

export type ServiceStatus = "active" | "disabled" | "archived" | "deleted";
export type ServiceType = "private_lessons" | "programs";

export type ServiceView = {
   id: string;
   type: ServiceType;
   scheduledAt: ProgramSchedule | null;
   durationMinutes: number;
   status: ServiceStatus;
   stripeProductId: string;
   coordinatorId: string | null;
   createdAt: Date;
   updatedAt: Date;
   title: string | null;
   description: string | null;
   priceCents: number | null;
   priceCurrency: string | null;
};

function rowToSchedule(
   row: typeof services.$inferSelect,
): ProgramSchedule | null {
   if (!row.startDate || !row.endDate) return null;
   return {
      startDate: row.startDate,
      endDate: row.endDate,
      slots: row.slots ?? [],
   };
}

async function buildServiceView(
   row: typeof services.$inferSelect,
): Promise<ServiceView> {
   const stripeData = await getStripeServiceData(row.stripeProductId);
   return {
      id: row.id,
      type: row.type,
      scheduledAt: rowToSchedule(row),
      durationMinutes: row.durationMinutes,
      status: row.status,
      stripeProductId: row.stripeProductId,
      coordinatorId: row.coordinatorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: stripeData?.title ?? null,
      description: stripeData?.description ?? null,
      priceCents: stripeData?.priceCents ?? null,
      priceCurrency: stripeData?.priceCurrency ?? null,
   };
}

/**
 * List services, optionally filtered by status. Defaults to all
 * non-deleted statuses.
 *
 * Cached via Next Cache Components with no explicit TTL; bust via the
 * `services` tag from the mutation actions in `./actions.ts`.
 */
export async function listServices(opts?: {
   status?: ServiceStatus | ReadonlyArray<ServiceStatus>;
}): Promise<ServiceView[]> {
   "use cache";
   cacheTag(SERVICES_TAG);

   const statusFilter = opts?.status
      ? Array.isArray(opts.status)
         ? opts.status
         : [opts.status]
      : (["active", "disabled", "archived"] as ServiceStatus[]);

   const rows = await db
      .select()
      .from(services)
      .where(inArray(services.status, statusFilter))
      .orderBy(desc(services.createdAt));

   return Promise.all(rows.map(buildServiceView));
}

/**
 * Fetch a single service by id, including its Stripe-derived fields.
 * Returns null if the service does not exist.
 *
 * Cached via Next Cache Components; bust via the `services` tag.
 */
export async function getService(id: string): Promise<ServiceView | null> {
   "use cache";
   cacheTag(SERVICES_TAG);

   if (!UUID_RE.test(id)) return null;

   const [row] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id)))
      .limit(1);
   if (!row) return null;
   return buildServiceView(row);
}

export type CoordinatorOption = {
   id: string;
   firstName: string;
   lastName: string;
};

/**
 * List all profiles with the `coordinator` role, ordered by name.
 *
 * Cached via Next Cache Components; bust via the `coordinators` tag when
 * coordinator assignments change.
 */
export async function listCoordinators(): Promise<CoordinatorOption[]> {
   "use cache";
   cacheTag(COORDINATORS_TAG);

   return db
      .select({
         id: profiles.id,
         firstName: profiles.firstName,
         lastName: profiles.lastName,
      })
      .from(profiles)
      .where(eq(profiles.role, "coordinator"))
      .orderBy(asc(profiles.firstName), asc(profiles.lastName));
}
