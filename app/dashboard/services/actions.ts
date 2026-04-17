"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cadStringToCents } from "@/lib/money";
import {
   createPrice,
   createProduct,
   deactivateActivePricesForProduct,
   updateProduct,
} from "@/lib/stripe";

export type ServiceActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const SERVICES_PATH = "/dashboard/services";
const SERVICES_TAG = "services";

const serviceTypeSchema = z.enum(["coaching_session", "booking"]);
const statusSchema = z.enum(["active", "disabled", "archived", "deleted"]);

const baseFields = z.object({
   title: z.string().min(1, "Title is required").max(500),
   description: z.string().max(5000).default(""),
   type: serviceTypeSchema,
   duration_minutes: z.coerce.number().int().min(1).max(24 * 60),
   scheduled_at: z.string().optional(),
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

export async function createService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = baseFields.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      type: formData.get("type"),
      duration_minutes: formData.get("duration_minutes"),
      scheduled_at: formData.get("scheduled_at")?.toString(),
      price_cad: formData.get("price_cad"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { title, type, duration_minutes, scheduled_at, price_cad } =
      parsed.data;
   const description = parsed.data.description.trim();

   const cents = cadStringToCents(price_cad);
   if (cents === null) {
      return { errors: { price_cad: ["Enter a valid price in CAD"] } };
   }

   let scheduledAtValue: unknown = null;
   if (type === "booking" && scheduled_at && scheduled_at.trim()) {
      try {
         const json = JSON.parse(scheduled_at);
         if (!Array.isArray(json)) {
            return { errors: { scheduled_at: ["Must be a JSON array"] } };
         }
         scheduledAtValue = json;
      } catch {
         return { errors: { scheduled_at: ["Must be valid JSON"] } };
      }
   }

   let createdProductId: string | null = null;
   try {
      const { productId } = await createProduct({
         name: title,
         description,
      });
      createdProductId = productId;

      await createPrice(productId, cents);

      await db.insert(services).values({
         type,
         scheduledAt: scheduledAtValue,
         durationMinutes: duration_minutes,
         stripeProductId: productId,
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
   description: z.string().max(5000).optional(),
   type: serviceTypeSchema.optional(),
   duration_minutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
   scheduled_at: z.string().optional(),
   price_cad: z.string().min(1, "Price cannot be empty").optional(),
});

/**
 * Read a FormData entry as a string, returning undefined when the key is
 * missing entirely. Empty strings are preserved (e.g. clearing description).
 */
function field(formData: FormData, name: string): string | undefined {
   const v = formData.get(name);
   return v === null ? undefined : v.toString();
}

export async function updateService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = updateFields.safeParse({
      service_id: field(formData, "service_id"),
      title: field(formData, "title"),
      description: field(formData, "description"),
      type: field(formData, "type"),
      duration_minutes: field(formData, "duration_minutes"),
      scheduled_at: field(formData, "scheduled_at"),
      price_cad: field(formData, "price_cad"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const {
      service_id,
      title,
      description,
      type,
      duration_minutes,
      scheduled_at,
      price_cad,
   } = parsed.data;

   let cents: number | undefined;
   if (price_cad !== undefined) {
      const parsedCents = cadStringToCents(price_cad);
      if (parsedCents === null) {
         return { errors: { price_cad: ["Enter a valid price in CAD"] } };
      }
      cents = parsedCents;
   }

   let scheduledAtValue: unknown;
   if (scheduled_at !== undefined) {
      const trimmed = scheduled_at.trim();
      if (trimmed === "") {
         scheduledAtValue = null;
      } else {
         try {
            const json = JSON.parse(trimmed);
            if (!Array.isArray(json)) {
               return { errors: { scheduled_at: ["Must be a JSON array"] } };
            }
            scheduledAtValue = json;
         } catch {
            return { errors: { scheduled_at: ["Must be valid JSON"] } };
         }
      }
   }

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, service_id))
      .limit(1);
   if (!row) {
      return { errors: { _form: ["Service not found"] } };
   }
   if (row.status !== "active" && row.status !== "disabled") {
      return {
         errors: { _form: ["Only active or disabled services can be edited"] },
      };
   }

   try {
      await updateProduct(row.stripeProductId, {
         name: title,
         description: description?.trim(),
      });

      if (cents !== undefined) {
         // Stripe Prices are immutable: deactivate the current active
         // price(s) and create a new one at the new amount.
         await deactivateActivePricesForProduct(row.stripeProductId);
         await createPrice(row.stripeProductId, cents);
      }

      const dbPatch: Partial<typeof services.$inferInsert> = {};
      if (type !== undefined) dbPatch.type = type;
      if (duration_minutes !== undefined) dbPatch.durationMinutes = duration_minutes;
      if (scheduled_at !== undefined) dbPatch.scheduledAt = scheduledAtValue;

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
