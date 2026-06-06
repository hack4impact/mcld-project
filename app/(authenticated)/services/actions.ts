"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { services, type ProgramSlot as DbProgramSlot } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cadStringToCents } from "@/lib/money";
import {
   createPrice,
   createProduct,
   deactivateActivePricesForProduct,
   getStripeServiceData,
   updateProduct,
} from "@/lib/stripe";

export type ServiceActionState = {
   errors?: Record<string, string[]>;
   message?: string;
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
   duration_minutes: z.coerce.number().int().min(1).max(24 * 60),
   price_cad: z.string().min(1, "Price is required"),
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

function parseProgramSchedule(formData: FormData): ParseResult<ProgramSchedule> {
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

function parseCoachId(formData: FormData): ParseResult<string> {
   const raw = field(formData, "coach_id");
   if (!raw)
      return {
         ok: false,
         errors: { coach_id: ["A coach is required for private lessons"] },
      };
   const result = z.string().uuid().safeParse(raw);
   if (!result.success) {
      return { ok: false, errors: { coach_id: ["Invalid coach"] } };
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
   });
   if (!parsed.success) {
      Object.assign(errors, parsed.error.flatten().fieldErrors);
   }

   // Validate price format independently so its error reports alongside
   // schedule/coach errors instead of in a separate round-trip.
   const priceRaw = formData.get("price_cad")?.toString() ?? "";
   let cents: number | null = null;
   if (priceRaw && !errors.price_cad) {
      cents = cadStringToCents(priceRaw);
      if (cents === null) {
         errors.price_cad = ["Enter a valid price in CAD"];
      }
   }

   // Schedule / coach checks key off the submitted type, not parsed.data,
   // so they still run when baseFields fails on unrelated fields.
   const typeRaw = formData.get("type")?.toString();
   let scheduledAtValue: ProgramSchedule | null = null;
   let coachIdValue: string | null = null;
   if (typeRaw === "programs") {
      const result = parseProgramSchedule(formData);
      if (!result.ok) {
         Object.assign(errors, result.errors);
      } else {
         scheduledAtValue = result.value;
      }
   } else if (typeRaw === "private_lessons") {
      const coach = parseCoachId(formData);
      if (!coach.ok) Object.assign(errors, coach.errors);
      else coachIdValue = coach.value;
   }

   if (Object.keys(errors).length > 0) {
      return { errors };
   }

   // Safe: we only reach here if baseFields parsed AND price validated.
   const { title, type, duration_minutes } = parsed.data!;
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

      await db.insert(services).values({
         type,
         startDate: scheduledAtValue?.startDate ?? null,
         endDate: scheduledAtValue?.endDate ?? null,
         slots: scheduledAtValue?.slots ?? null,
         durationMinutes: duration_minutes,
         stripeProductId: productId,
         coachId: coachIdValue,
         status: "active",
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
   description: z.string().min(1, "Description cannot be empty").max(1000).optional(),
   duration_minutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
   price_cad: z.string().min(1, "Price cannot be empty").optional(),
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
   if (row.type === "programs" && formData.has("start_date")) {
      const result = parseProgramSchedule(formData);
      if (!result.ok) {
         Object.assign(errors, result.errors);
      } else {
         scheduledAtValue = result.value;
      }
   }

   // Private lessons can be reassigned to a different coach, but the coach
   // remains mandatory: an empty/invalid value is rejected.
   let coachIdValue: string | undefined;
   if (row.type === "private_lessons" && formData.has("coach_id")) {
      const coach = parseCoachId(formData);
      if (!coach.ok) Object.assign(errors, coach.errors);
      else coachIdValue = coach.value;
   }

   if (Object.keys(errors).length > 0) {
      return { errors };
   }

   const { title, description, duration_minutes } = parsed.data!;
   const service_id = serviceId;

   try {
      await updateProduct(row.stripeProductId, {
         name: title,
         description: description?.trim(),
      });

      if (cents !== undefined) {
         // The edit form always submits the price, so only swap it when the
         // amount actually changed. Recreating an unchanged price needlessly
         // archives the product's default price, which Stripe rejects.
         const current = await getStripeServiceData(row.stripeProductId);
         if (current?.priceCents !== cents) {
            // Stripe Prices are immutable: deactivate the current active
            // price(s) and create a new one at the new amount.
            await deactivateActivePricesForProduct(row.stripeProductId);
            await createPrice(row.stripeProductId, cents);
         }
      }

      const dbPatch: Partial<typeof services.$inferInsert> = {};
      if (duration_minutes !== undefined) dbPatch.durationMinutes = duration_minutes;
      if (coachIdValue !== undefined) dbPatch.coachId = coachIdValue;
      if (scheduledAtValue !== undefined) {
         dbPatch.startDate = scheduledAtValue.startDate;
         dbPatch.endDate = scheduledAtValue.endDate;
         dbPatch.slots = scheduledAtValue.slots;
      }

      if (Object.keys(dbPatch).length > 0) {
         dbPatch.updatedAt = new Date();
         await db
            .update(services)
            .set(dbPatch)
            .where(eq(services.id, service_id));
      }
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
               e instanceof Error ? e.message : "Could not update service status",
            ],
         },
      };
   }

   bustServicesCache();
   return { message: "Service status updated." };
}
