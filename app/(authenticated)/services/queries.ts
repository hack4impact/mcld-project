import { cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
   children,
   formQuestionAnswers,
   formQuestions,
   privateLessonSessions,
   profiles,
   programCoordinators,
   serviceBookings,
   services,
} from "@/lib/db/schema";
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
   isForChildren: boolean;
   formId: string | null;
   scheduledAt: ProgramSchedule | null;
   durationMinutes: number;
   status: ServiceStatus;
   stripeProductId: string;
   coordinatorId: string | null;
   /** Program coordinators (many-to-many). Empty for private lessons. */
   coordinatorIds: string[];
   createdAt: Date;
   updatedAt: Date;
   title: string | null;
   description: string | null;
   priceCents: number | null;
   priceCurrency: string | null;
   requiresSubscription: boolean;
   isScheduled: boolean;
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
   coordinatorIds: string[] = [],
): Promise<ServiceView> {
   const stripeData = await getStripeServiceData(row.stripeProductId);
   return {
      id: row.id,
      type: row.type,
      isForChildren: row.isForChildren,
      formId: row.formId,
      scheduledAt: rowToSchedule(row),
      durationMinutes: row.durationMinutes,
      status: row.status,
      stripeProductId: row.stripeProductId,
      coordinatorId: row.coordinatorId,
      coordinatorIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      title: stripeData?.title ?? null,
      description: stripeData?.description ?? null,
      priceCents: stripeData?.priceCents ?? null,
      priceCurrency: stripeData?.priceCurrency ?? null,
      requiresSubscription: row.requiresSubscription,
      isScheduled: row.type === "private_lessons" && row.isScheduled,
   };
}

/**
 * Load program-coordinator assignments for the given service ids, grouped by
 * service id. Returns an empty map when there are no ids.
 */
async function loadProgramCoordinators(
   serviceIds: string[],
): Promise<Map<string, string[]>> {
   const map = new Map<string, string[]>();
   if (serviceIds.length === 0) return map;

   const rows = await db
      .select({
         serviceId: programCoordinators.serviceId,
         coordinatorId: programCoordinators.coordinatorId,
      })
      .from(programCoordinators)
      .where(inArray(programCoordinators.serviceId, serviceIds));

   for (const row of rows) {
      const existing = map.get(row.serviceId);
      if (existing) existing.push(row.coordinatorId);
      else map.set(row.serviceId, [row.coordinatorId]);
   }
   return map;
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

   const coordinatorMap = await loadProgramCoordinators(rows.map((r) => r.id));
   return Promise.all(
      rows.map((row) =>
         buildServiceView(row, coordinatorMap.get(row.id) ?? []),
      ),
   );
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
   const coordinatorMap = await loadProgramCoordinators([row.id]);
   return buildServiceView(row, coordinatorMap.get(row.id) ?? []);
}

/**
 * List the non-deleted services a given coordinator is responsible for:
 * private lessons assigned to them via `services.coordinator_id`, plus programs
 * they are attached to via `program_coordinators`.
 *
 * Cached via Next Cache Components; bust via the `services`/`coordinators` tags.
 */
export async function listServicesForCoordinator(
   coordinatorId: string,
): Promise<ServiceView[]> {
   "use cache";
   cacheTag(SERVICES_TAG);
   cacheTag(COORDINATORS_TAG);

   if (!UUID_RE.test(coordinatorId)) return [];

   const visibleStatuses: ServiceStatus[] = ["active", "disabled", "archived"];

   const programIds = await db
      .select({ serviceId: programCoordinators.serviceId })
      .from(programCoordinators)
      .where(eq(programCoordinators.coordinatorId, coordinatorId));

   const rows = await db
      .select()
      .from(services)
      .where(
         and(
            inArray(services.status, visibleStatuses),
            programIds.length > 0
               ? or(
                    eq(services.coordinatorId, coordinatorId),
                    inArray(
                       services.id,
                       programIds.map((p) => p.serviceId),
                    ),
                 )
               : eq(services.coordinatorId, coordinatorId),
         ),
      )
      .orderBy(desc(services.createdAt));

   const coordinatorMap = await loadProgramCoordinators(rows.map((r) => r.id));
   return Promise.all(
      rows.map((row) =>
         buildServiceView(row, coordinatorMap.get(row.id) ?? []),
      ),
   );
}

/**
 * Whether the given coordinator is responsible for a service — either the
 * single coordinator on a private lesson, or a member of a program's
 * `program_coordinators`. Used to authorize the read-only coordinator views.
 */
export async function isServiceCoordinator(
   coordinatorId: string,
   serviceId: string,
): Promise<boolean> {
   if (!UUID_RE.test(coordinatorId) || !UUID_RE.test(serviceId)) return false;

   const [direct] = await db
      .select({ id: services.id })
      .from(services)
      .where(
         and(
            eq(services.id, serviceId),
            eq(services.coordinatorId, coordinatorId),
         ),
      )
      .limit(1);
   if (direct) return true;

   const [program] = await db
      .select({ id: programCoordinators.id })
      .from(programCoordinators)
      .where(
         and(
            eq(programCoordinators.serviceId, serviceId),
            eq(programCoordinators.coordinatorId, coordinatorId),
         ),
      )
      .limit(1);
   return Boolean(program);
}

export type RegistrationAnswer = { prompt: string; answer: string[] };

export type ServiceRegistration = {
   bookingId: string;
   registrantName: string;
   isChild: boolean;
   status: string;
   createdAt: Date;
   answers: RegistrationAnswer[];
};

const REGISTERED_BOOKING_STATUSES = ["pending", "confirmed"] as const;
const REGISTERED_LESSON_STATUSES = ["pending", "confirmed", "completed"] as const;

type RegistrantRow = {
   bookingId: string;
   status: string;
   createdAt: Date;
   childId: string | null;
   childFirstName: string | null;
   childLastName: string | null;
   userFirstName: string;
   userLastName: string;
};

export async function listServiceRegistrations(
   serviceId: string,
): Promise<ServiceRegistration[]> {
   if (!UUID_RE.test(serviceId)) return [];

   const [service] = await db
      .select({ type: services.type, formId: services.formId })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
   if (!service) return [];

   const rows: RegistrantRow[] =
      service.type === "private_lessons"
         ? await db
              .select({
                 bookingId: privateLessonSessions.id,
                 status: privateLessonSessions.status,
                 createdAt: privateLessonSessions.createdAt,
                 childId: privateLessonSessions.childId,
                 childFirstName: children.firstName,
                 childLastName: children.lastName,
                 userFirstName: profiles.firstName,
                 userLastName: profiles.lastName,
              })
              .from(privateLessonSessions)
              .innerJoin(profiles, eq(profiles.id, privateLessonSessions.userId))
              .leftJoin(children, eq(children.id, privateLessonSessions.childId))
              .where(
                 and(
                    eq(privateLessonSessions.serviceId, serviceId),
                    inArray(privateLessonSessions.status, [
                       ...REGISTERED_LESSON_STATUSES,
                    ]),
                 ),
              )
              .orderBy(desc(privateLessonSessions.createdAt))
         : await db
              .select({
                 bookingId: serviceBookings.id,
                 status: serviceBookings.status,
                 createdAt: serviceBookings.createdAt,
                 childId: serviceBookings.childId,
                 childFirstName: children.firstName,
                 childLastName: children.lastName,
                 userFirstName: profiles.firstName,
                 userLastName: profiles.lastName,
              })
              .from(serviceBookings)
              .innerJoin(profiles, eq(profiles.id, serviceBookings.userId))
              .leftJoin(children, eq(children.id, serviceBookings.childId))
              .where(
                 and(
                    eq(serviceBookings.serviceId, serviceId),
                    eq(serviceBookings.isActive, true),
                    inArray(serviceBookings.status, [
                       ...REGISTERED_BOOKING_STATUSES,
                    ]),
                 ),
              )
              .orderBy(desc(serviceBookings.createdAt));

   const childIds = [
      ...new Set(
         rows.map((r) => r.childId).filter((id): id is string => id !== null),
      ),
   ];

   const answersByChild = new Map<string, RegistrationAnswer[]>();
   if (service.formId && childIds.length > 0) {
      const answerRows = await db
         .select({
            childId: formQuestionAnswers.childId,
            prompt: formQuestions.prompt,
            answer: formQuestionAnswers.answer,
         })
         .from(formQuestionAnswers)
         .innerJoin(
            formQuestions,
            eq(formQuestions.id, formQuestionAnswers.formQuestionId),
         )
         .where(
            and(
               inArray(formQuestionAnswers.childId, childIds),
               eq(formQuestions.formId, service.formId),
            ),
         )
         .orderBy(asc(formQuestions.sortOrder));

      for (const a of answerRows) {
         const list = answersByChild.get(a.childId) ?? [];
         list.push({ prompt: a.prompt, answer: a.answer });
         answersByChild.set(a.childId, list);
      }
   }

   return rows.map((r) => ({
      bookingId: r.bookingId,
      registrantName: r.childId
         ? `${r.childFirstName ?? ""} ${r.childLastName ?? ""}`.trim()
         : `${r.userFirstName} ${r.userLastName}`.trim(),
      isChild: r.childId !== null,
      status: r.status,
      createdAt: r.createdAt,
      answers: r.childId ? (answersByChild.get(r.childId) ?? []) : [],
   }));
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
