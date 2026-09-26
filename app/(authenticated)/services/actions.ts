"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
   profiles,
   programCoordinators,
   services,
   type ProgramSlot as DbProgramSlot,
} from "@/lib/db/schema";
import { getUserRole, requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";
import {
   isServiceCoordinator,
   listCashSessionClients,
   listServiceRegistrations,
   type CashSessionClient,
   type ServiceRegistration,
} from "@/app/(authenticated)/services/queries";
import { recordCashSessionSchema } from "@/app/(authenticated)/services/cash-session-schema";
import { cadStringToCents } from "@/lib/money";
import {
   CashInvoiceReviewError,
   createPrice,
   createProduct,
   getOrCreateStripeCustomer,
   getStripeServiceData,
   recordOutOfBandInvoice,
   replaceProductPrice,
   updateProduct,
} from "@/lib/stripe";

export type ServiceActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   cashSession?: {
      invoiceId: string;
      submissionId: string;
      amountCents: number;
      currency: string;
   };
   retryRequired?: boolean;
   reviewRequired?: boolean;
} | null;

export type ProgramSlot = DbProgramSlot;

export type ProgramSchedule = {
   startDate: string;
   endDate: string;
   slots: ProgramSlot[];
};

const SERVICES_PATH = "/services";
const SERVICES_TAG = "services";

const serviceTypeSchema = z.enum(["private_lessons", "programs"]);
const statusSchema = z.enum(["active", "disabled", "archived", "deleted"]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const slotSchema = z.object({
   dayOfWeek: z.number().int().min(0).max(6),
   time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
});

const baseFields = z.object({
   title: z.string().min(1, "Title is required").max(500),
   description: z.string().min(1, "Description is required").max(1000),
   type: serviceTypeSchema,
   duration_minutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60),
   price_cad: z.string().min(1, "Price is required"),
   requires_subscription: z.enum(["true", "false"]),
});

const ALLOWED_TRANSITIONS: Record<
   z.infer<typeof statusSchema>,
   ReadonlyArray<z.infer<typeof statusSchema>>
> = {
   active: ["disabled", "archived"],
   disabled: ["active", "archived"],
   archived: ["active", "deleted"],
   deleted: [],
};

function bustServicesCache() {
   updateTag(SERVICES_TAG);
   revalidatePath(SERVICES_PATH);
}

function field(formData: FormData, name: string): string | undefined {
   const v = formData.get(name);
   return v === null ? undefined : v.toString();
}

type ParseResult<T> =
   | { ok: true; value: T }
   | { ok: false; errors: Record<string, string[]> };

function parseProgramSchedule(
   formData: FormData,
): ParseResult<ProgramSchedule> {
   const startRaw = field(formData, "start_date");
   const endRaw = field(formData, "end_date");
   const slotsRaw = field(formData, "slots");
   const errors: Record<string, string[]> = {};

   const start = startRaw ? isoDateSchema.safeParse(startRaw) : null;
   const end = endRaw ? isoDateSchema.safeParse(endRaw) : null;

   if (!startRaw) errors.start_date = ["Start date is required"];
   else if (start && !start.success) errors.start_date = ["Invalid start date"];

   if (!endRaw) errors.end_date = ["End date is required"];
   else if (end && !end.success) errors.end_date = ["Invalid end date"];

   let slots: ProgramSlot[] = [];
   if (!slotsRaw) {
      errors.slots = ["At least one slot is required"];
   } else {
      try {
         const parsed = JSON.parse(slotsRaw);
         const result = z.array(slotSchema).min(1).safeParse(parsed);
         if (!result.success) {
            errors.slots = ["At least one valid slot is required"];
         } else {
            slots = result.data;
         }
      } catch {
         errors.slots = ["Invalid slot format"];
      }
   }

   if (startRaw && endRaw && start?.success && end?.success) {
      if (startRaw > endRaw) {
         errors.end_date = ["End date must be on or after start date"];
      }
   }

   if (Object.keys(errors).length > 0) return { ok: false, errors };
   return {
      ok: true,
      value: { startDate: startRaw!, endDate: endRaw!, slots },
   };
}

/**
 * Parse the optional `coordinator_ids` field for programs: a JSON array of
 * coordinator UUIDs. Programs may have zero or more coordinators, so an empty
 * or missing value is valid and yields an empty list.
 */
function parseCoordinatorIds(formData: FormData): ParseResult<string[]> {
   const raw = field(formData, "coordinator_ids");
   if (!raw) return { ok: true, value: [] };

   let parsed: unknown;
   try {
      parsed = JSON.parse(raw);
   } catch {
      return {
         ok: false,
         errors: { coordinator_ids: ["Invalid coordinator selection"] },
      };
   }

   const result = z.array(z.string().uuid()).safeParse(parsed);
   if (!result.success) {
      return {
         ok: false,
         errors: { coordinator_ids: ["Invalid coordinator selection"] },
      };
   }
   // De-duplicate so the unique index never rejects a double-selection.
   return { ok: true, value: [...new Set(result.data)] };
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function missingCoordinators(ids: string[]): Promise<boolean> {
   if (ids.length === 0) return false;
   const found = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(inArray(profiles.id, ids), eq(profiles.role, "coordinator")));
   const foundIds = new Set(found.map((row) => row.id));
   return ids.some((id) => !foundIds.has(id));
}

async function setProgramCoordinators(
   tx: DbTransaction,
   serviceId: string,
   coordinatorIds: string[],
): Promise<void> {
   await tx
      .select({ id: services.id })
      .from(services)
      .where(eq(services.id, serviceId))
      .for("update");
   await tx
      .delete(programCoordinators)
      .where(eq(programCoordinators.serviceId, serviceId));
   if (coordinatorIds.length > 0) {
      await tx.insert(programCoordinators).values(
         coordinatorIds.map((coordinatorId) => ({
            serviceId,
            coordinatorId,
         })),
      );
   }
}

function parseCoordinatorId(formData: FormData): ParseResult<string> {
   const raw = field(formData, "coordinator_id");
   if (!raw)
      return {
         ok: false,
         errors: {
            coordinator_id: ["A coordinator is required for private lessons"],
         },
      };
   const result = z.string().uuid().safeParse(raw);
   if (!result.success) {
      return { ok: false, errors: { coordinator_id: ["Invalid coordinator"] } };
   }
   return { ok: true, value: result.data };
}

export async function createService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const errors: Record<string, string[]> = {};

   const parsed = baseFields.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      type: formData.get("type"),
      duration_minutes: formData.get("duration_minutes"),
      price_cad: formData.get("price_cad"),
      requires_subscription: formData.get("requires_subscription"),
   });
   if (!parsed.success) {
      Object.assign(errors, parsed.error.flatten().fieldErrors);
   }

   // Validate price format independently so its error reports alongside
   // schedule/coordinator errors instead of in a separate round-trip.
   const priceRaw = formData.get("price_cad")?.toString() ?? "";
   let cents: number | null = null;
   if (priceRaw && !errors.price_cad) {
      cents = cadStringToCents(priceRaw);
      if (cents === null) {
         errors.price_cad = ["Enter a valid price in CAD"];
      }
   }

   // Schedule / coordinator checks key off the submitted type, not parsed.data,
   // so they still run when baseFields fails on unrelated fields.
   const typeRaw = formData.get("type")?.toString();
   let scheduledAtValue: ProgramSchedule | null = null;
   let coordinatorIdValue: string | null = null;
   let coordinatorIdsValue: string[] = [];
   if (typeRaw === "programs") {
      const result = parseProgramSchedule(formData);
      if (!result.ok) {
         Object.assign(errors, result.errors);
      } else {
         scheduledAtValue = result.value;
      }
      const coordinators = parseCoordinatorIds(formData);
      if (!coordinators.ok) Object.assign(errors, coordinators.errors);
      else coordinatorIdsValue = coordinators.value;
   } else if (typeRaw === "private_lessons") {
      const coordinator = parseCoordinatorId(formData);
      if (!coordinator.ok) Object.assign(errors, coordinator.errors);
      else coordinatorIdValue = coordinator.value;
   }

   if (
      Object.keys(errors).length === 0 &&
      (await missingCoordinators(coordinatorIdsValue))
   ) {
      errors.coordinator_ids = [
         "One or more selected coordinators no longer exist",
      ];
   }
   if (
      Object.keys(errors).length === 0 &&
      coordinatorIdValue &&
      (await missingCoordinators([coordinatorIdValue]))
   ) {
      errors.coordinator_id = ["The selected coordinator no longer exists"];
   }

   if (Object.keys(errors).length > 0) {
      return { errors };
   }

   // Safe: we only reach here if baseFields parsed AND price validated.
   const { title, type, duration_minutes, requires_subscription } =
      parsed.data!;
   const description = parsed.data!.description.trim();
   const priceCents = cents as number;

   let createdProductId: string | null = null;
   try {
      const { productId } = await createProduct({
         name: title,
         description,
      });
      createdProductId = productId;

      await createPrice(productId, priceCents);

      await db.transaction(async (tx) => {
         const [created] = await tx
            .insert(services)
            .values({
               type,
               startDate: scheduledAtValue?.startDate ?? null,
               endDate: scheduledAtValue?.endDate ?? null,
               slots: scheduledAtValue?.slots ?? null,
               durationMinutes: duration_minutes,
               stripeProductId: productId,
               coordinatorId: coordinatorIdValue,
               status: "active",
               requiresSubscription: requires_subscription === "true",
            })
            .returning({ id: services.id });

         if (type === "programs") {
            await setProgramCoordinators(tx, created.id, coordinatorIdsValue);
         }
      });
   } catch (e) {
      if (createdProductId) {
         try {
            await updateProduct(createdProductId, { active: false });
         } catch {}
      }
      console.error(e);
      return {
         errors: {
            _form: [
               e instanceof Error ? e.message : "Could not create service",
            ],
         },
      };
   }

   bustServicesCache();
   return { message: "Service created." };
}

/**
 * PATCH-style update: every field except `service_id` is optional. Fields
 * not present in the payload are not touched (DB nor Stripe). The frontend
 * is expected to send only the fields the admin actually changed.
 */
const updateFields = z.object({
   service_id: z.string().uuid(),
   title: z.string().min(1, "Title cannot be empty").max(500).optional(),
   description: z
      .string()
      .min(1, "Description cannot be empty")
      .max(1000)
      .optional(),
   duration_minutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
   price_cad: z.string().min(1, "Price cannot be empty").optional(),
   requires_subscription: z.enum(["true", "false"]).optional(),
});

export async function updateService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const errors: Record<string, string[]> = {};

   const parsed = updateFields.safeParse({
      service_id: field(formData, "service_id"),
      title: field(formData, "title") || undefined,
      description: field(formData, "description") || undefined,
      duration_minutes: field(formData, "duration_minutes") || undefined,
      price_cad: field(formData, "price_cad") || undefined,
      requires_subscription:
         field(formData, "requires_subscription") || undefined,
   });
   if (!parsed.success) {
      Object.assign(errors, parsed.error.flatten().fieldErrors);
   }

   // Validate price format independently from baseFields so its error
   // surfaces alongside any schedule errors in a single round-trip.
   const priceRaw = field(formData, "price_cad");
   let cents: number | undefined;
   if (priceRaw && !errors.price_cad) {
      const parsedCents = cadStringToCents(priceRaw);
      if (parsedCents === null) {
         errors.price_cad = ["Enter a valid price in CAD"];
      } else {
         cents = parsedCents;
      }
   }

   // service_id is required for the lookup; bail if it's missing/invalid.
   const serviceId = parsed.success ? parsed.data.service_id : undefined;
   if (!serviceId) {
      return { errors };
   }

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
   if (!row) {
      return { errors: { ...errors, _form: ["Service not found"] } };
   }
   if (row.status !== "active" && row.status !== "disabled") {
      return {
         errors: {
            ...errors,
            _form: ["Only active or disabled services can be edited"],
         },
      };
   }

   let scheduledAtValue: ProgramSchedule | undefined;
   let coordinatorIdValue: string | undefined;
   let coordinatorIdsValue: string[] | undefined;
   if (row.type === "programs" && formData.has("start_date")) {
      const result = parseProgramSchedule(formData);
      if (!result.ok) {
         Object.assign(errors, result.errors);
      } else {
         scheduledAtValue = result.value;
      }
   }
   if (row.type === "programs" && formData.has("coordinator_ids")) {
      const coordinators = parseCoordinatorIds(formData);
      if (!coordinators.ok) Object.assign(errors, coordinators.errors);
      else coordinatorIdsValue = coordinators.value;
   }
   if (row.type === "private_lessons" && formData.has("coordinator_id")) {
      // Private lessons can be reassigned to a different coordinator, but the
      // coordinator remains mandatory: an empty/invalid value is rejected.
      const coordinator = parseCoordinatorId(formData);
      if (!coordinator.ok) Object.assign(errors, coordinator.errors);
      else coordinatorIdValue = coordinator.value;
   }

   if (
      Object.keys(errors).length === 0 &&
      coordinatorIdsValue &&
      (await missingCoordinators(coordinatorIdsValue))
   ) {
      errors.coordinator_ids = [
         "One or more selected coordinators no longer exist",
      ];
   }
   if (
      Object.keys(errors).length === 0 &&
      coordinatorIdValue &&
      (await missingCoordinators([coordinatorIdValue]))
   ) {
      errors.coordinator_id = ["The selected coordinator no longer exists"];
   }

   if (Object.keys(errors).length > 0) {
      return { errors };
   }

   const { title, description, duration_minutes, requires_subscription } =
      parsed.data!;
   const service_id = serviceId;

   try {
      await updateProduct(row.stripeProductId, {
         name: title,
         description: description?.trim(),
      });

      if (cents !== undefined) {
         const current = await getStripeServiceData(row.stripeProductId);
         if (current?.priceCents !== cents) {
            await replaceProductPrice(row.stripeProductId, cents);
         }
      }

      const dbPatch: Partial<typeof services.$inferInsert> = {};
      if (duration_minutes !== undefined)
         dbPatch.durationMinutes = duration_minutes;
      if (coordinatorIdValue !== undefined)
         dbPatch.coordinatorId = coordinatorIdValue;
      if (scheduledAtValue !== undefined) {
         dbPatch.startDate = scheduledAtValue.startDate;
         dbPatch.endDate = scheduledAtValue.endDate;
         dbPatch.slots = scheduledAtValue.slots;
      }
      if (requires_subscription !== undefined) {
         dbPatch.requiresSubscription = requires_subscription === "true";
      }

      await db.transaction(async (tx) => {
         if (Object.keys(dbPatch).length > 0) {
            dbPatch.updatedAt = new Date();
            await tx
               .update(services)
               .set(dbPatch)
               .where(eq(services.id, service_id));
         }

         if (coordinatorIdsValue !== undefined) {
            await setProgramCoordinators(tx, service_id, coordinatorIdsValue);
         }
      });
   } catch (e) {
      console.error(e);
      return {
         errors: {
            _form: [
               e instanceof Error ? e.message : "Could not update service",
            ],
         },
      };
   }

   bustServicesCache();
   return { message: "Service updated." };
}

const statusFields = z.object({
   service_id: z.string().uuid(),
   status: statusSchema,
});

export async function setServiceStatus(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = statusFields.safeParse({
      service_id: formData.get("service_id"),
      status: formData.get("status"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { service_id, status: nextStatus } = parsed.data;

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, service_id))
      .limit(1);
   if (!row) {
      return { errors: { _form: ["Service not found"] } };
   }

   if (row.status === nextStatus) {
      return { message: "No change." };
   }
   if (!ALLOWED_TRANSITIONS[row.status].includes(nextStatus)) {
      return {
         errors: {
            _form: [`Cannot change status from ${row.status} to ${nextStatus}`],
         },
      };
   }

   try {
      await db
         .update(services)
         .set({ status: nextStatus, updatedAt: new Date() })
         .where(eq(services.id, service_id));

      // Stripe product is active only when DB status === "active".
      await updateProduct(row.stripeProductId, {
         active: nextStatus === "active",
      });
   } catch (e) {
      console.error(e);
      return {
         errors: {
            _form: [
               e instanceof Error
                  ? e.message
                  : "Could not update service status",
            ],
         },
      };
   }

   bustServicesCache();
   return { message: "Service status updated." };
}

/**
 * On-demand fetch of a service's registrations for the read-only view.
 * Admins may view any service; coordinators only services they coordinate.
 */
export async function fetchServiceRegistrations(
   serviceId: string,
): Promise<ServiceRegistration[]> {
   const role = await getUserRole();
   if (role === ROLES.ADMIN) {
      return listServiceRegistrations(serviceId);
   }
   if (role === ROLES.COORDINATOR) {
      const supabase = await createClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();
      if (user && (await isServiceCoordinator(user.id, serviceId))) {
         return listServiceRegistrations(serviceId);
      }
   }
   throw new Error("Forbidden");
}

/**
 * Current user's id if they may record cash sessions on this service: admins
 * on any service, coordinators only on services they coordinate.
 */
async function authorizeCashSession(serviceId: string): Promise<string | null> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return null;

   const role = await getUserRole();
   if (role === ROLES.ADMIN) return user.id;
   if (
      role === ROLES.COORDINATOR &&
      (await isServiceCoordinator(user.id, serviceId))
   ) {
      return user.id;
   }
   return null;
}

export async function fetchCashSessionClients(
   serviceId: string,
): Promise<CashSessionClient[]> {
   if (!(await authorizeCashSession(serviceId))) throw new Error("Forbidden");
   return listCashSessionClients();
}

/**
 * Cash attendance and its financial record are stored on the same Stripe
 * invoice. No local session is created or deleted. The caller retains its
 * submission identity so an uncertain response can resume the same invoice.
 */
export async function recordCashSession(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   const parsed = recordCashSessionSchema.safeParse({
      submission_id: field(formData, "submission_id"),
      submitted_at: field(formData, "submitted_at"),
      service_id: field(formData, "service_id"),
      user_id: field(formData, "user_id"),
      child_id: field(formData, "child_id"),
      session_at: field(formData, "session_at"),
      collected_at: field(formData, "collected_at"),
      duration_minutes: field(formData, "duration_minutes"),
      amount: field(formData, "amount"),
      adjustment_reason: field(formData, "adjustment_reason"),
   });
   if (!parsed.success)
      return {
         retryRequired: false,
         errors: parsed.error.flatten().fieldErrors,
      };
   const input = parsed.data;

   // Do all authorization and validation before attempting any Stripe writes.
   let recorderId: string;
   let service: typeof services.$inferSelect;
   let client: CashSessionClient;
   let stripeData: NonNullable<
      Awaited<ReturnType<typeof getStripeServiceData>>
   >;
   try {
      const authorizedRecorder = await authorizeCashSession(input.service_id);
      if (!authorizedRecorder)
         return { retryRequired: false, errors: { _form: ["Unauthorized"] } };
      recorderId = authorizedRecorder;
      const [selectedService] = await db
         .select()
         .from(services)
         .where(eq(services.id, input.service_id))
         .limit(1);
      if (
         !selectedService ||
         selectedService.type !== "private_lessons" ||
         selectedService.status !== "active" ||
         !selectedService.coordinatorId
      ) {
         return {
            retryRequired: false,
            errors: {
               _form: [
                  "Cash sessions can only be recorded on active private lessons.",
               ],
            },
         };
      }
      service = selectedService;
      const [selectedClient] = await listCashSessionClients({
         userId: input.user_id,
      });
      if (!selectedClient || !selectedClient.email) {
         return {
            retryRequired: false,
            errors: { user_id: ["Select a registered client"] },
         };
      }
      client = selectedClient;
      if (service.isForChildren && !input.child_id) {
         return {
            retryRequired: false,
            errors: { child_id: ["Select which child attended"] },
         };
      }
      if (!service.isForChildren && input.child_id) {
         return {
            retryRequired: false,
            errors: { child_id: ["This service is for adult clients"] },
         };
      }
      if (
         input.child_id &&
         !client.children.some((c) => c.id === input.child_id)
      ) {
         return {
            retryRequired: false,
            errors: { child_id: ["This child doesn't belong to the client"] },
         };
      }
      const data = await getStripeServiceData(service.stripeProductId);
      if (!data?.priceCents || !data.priceCurrency) {
         return {
            retryRequired: false,
            errors: { _form: ["This service has no price in Stripe."] },
         };
      }
      stripeData = data;
      if (input.amount !== data.priceCents && !input.adjustment_reason) {
         return {
            retryRequired: false,
            errors: {
               adjustment_reason: ["Explain why the price was adjusted"],
            },
         };
      }
   } catch (error) {
      console.error("[recordCashSession] Could not validate recording", error);
      return {
         retryRequired: false,
         errors: {
            _form: ["Could not check this recording. Please try again."],
         },
      };
   }

   try {
      const customerId = await getOrCreateStripeCustomer(
         client.id,
         client.email,
      );
      const invoiceId = await recordOutOfBandInvoice({
         customerId,
         productId: service.stripeProductId,
         amountCents: input.amount,
         currency: stripeData.priceCurrency!,
         description: `${stripeData.title} — paid in cash`,
         metadata: {
            type: "cash_private_lesson",
            schemaVersion: "1",
            submissionId: input.submission_id,
            privateLessonSessionId: input.submission_id,
            submittedAt: input.submitted_at.toISOString(),
            serviceId: service.id,
            userId: client.id,
            childId: input.child_id ?? "",
            collectedBy: service.coordinatorId!,
            recordedBy: recorderId,
            sessionAt: input.session_at.toISOString(),
            collectedAt: input.collected_at.toISOString(),
            durationMinutes: String(input.duration_minutes),
            ...(input.adjustment_reason
               ? { adjustmentReason: input.adjustment_reason }
               : {}),
         },
         idempotencyKey: `cash-session:${input.submission_id}`,
         submittedAt: input.submitted_at.getTime(),
      });
      return {
         message: "Cash session recorded.",
         cashSession: {
            invoiceId,
            submissionId: input.submission_id,
            amountCents: input.amount,
            currency: stripeData.priceCurrency!,
         },
      };
   } catch (error) {
      console.error(
         "[recordCashSession] Invoice could not be confirmed",
         error,
      );
      return {
         retryRequired: true,
         ...(error instanceof CashInvoiceReviewError
            ? { reviewRequired: true }
            : {}),
         errors: {
            _form: [
               error instanceof CashInvoiceReviewError
                  ? error.message
                  : "The recording could not be confirmed. Retry this same recording to avoid recording the payment twice.",
            ],
         },
      };
   }
}
