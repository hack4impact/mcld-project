"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { stripeProductShouldBeActive } from "@/lib/stripe-visibility";
import {
   createStripeProductWithCadPrice,
   deleteStripeProduct,
   getLatestCadOneTimePrice,
   replaceCadOneTimePrice,
   setStripeProductActive,
   updateStripeProductDetails,
} from "@/lib/stripe";

export type ServiceActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const serviceTypeSchema = z.enum(["coaching_session", "booking"]);

function cadStringToCents(raw: string): number | null {
   const n = Number.parseFloat(raw.trim().replace(",", "."));
   if (Number.isNaN(n) || n < 0) return null;
   return Math.round(n * 100);
}

function parseScheduledAtJson(
   raw: string | null,
   serviceType: z.infer<typeof serviceTypeSchema>
): { ok: true; value: unknown } | { ok: false; error: string } {
   const trimmed = raw?.trim() ?? "";
   if (serviceType === "coaching_session") {
      return { ok: true, value: null };
   }
   if (!trimmed) {
      return { ok: true, value: null };
   }
   try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
         return { ok: false, error: "scheduled_at must be a JSON array" };
      }
      return { ok: true, value: parsed };
   } catch {
      return { ok: false, error: "scheduled_at must be valid JSON" };
   }
}

async function syncStripeProduct(row: {
   stripeProductId: string;
   status: "active" | "archived" | "deleted";
   isOffered: boolean;
}) {
   await setStripeProductActive(
      row.stripeProductId,
      stripeProductShouldBeActive(row)
   );
}

const baseFields = z.object({
   title: z.string().min(1, "Title is required").max(500),
   description: z.string().max(5000).optional(),
   type: serviceTypeSchema,
   duration_minutes: z.coerce.number().int().min(1).max(24 * 60),
   scheduled_at: z.string().optional(),
   price_cad: z.string().min(1, "Price is required"),
});

export async function createService(
   _prev: ServiceActionState,
   formData: FormData
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = baseFields.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
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
   const description = parsed.data.description?.trim() || null;
   const cents = cadStringToCents(price_cad);
   if (cents === null) {
      return { errors: { price_cad: ["Enter a valid price in CAD"] } };
   }

   const sched = parseScheduledAtJson(scheduled_at ?? null, type);
   if (!sched.ok) {
      return { errors: { scheduled_at: [sched.error] } };
   }

   let stripeProductId: string | null = null;
   try {
      const { productId } = await createStripeProductWithCadPrice({
         title,
         description,
         amountCents: cents,
      });
      stripeProductId = productId;

      await db.insert(services).values({
         title,
         description,
         type,
         scheduledAt: sched.value,
         durationMinutes: duration_minutes,
         stripeProductId: productId,
         status: "active",
         isOffered: true,
      });
   } catch (e) {
      if (stripeProductId) {
         try {
            await deleteStripeProduct(stripeProductId);
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

   revalidatePath("/dashboard/services");
   return { message: "Service created." };
}

const updateFields = baseFields.extend({
   service_id: z.string().uuid(),
});

export async function updateService(
   _prev: ServiceActionState,
   formData: FormData
): Promise<ServiceActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = updateFields.safeParse({
      service_id: formData.get("service_id"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      type: formData.get("type"),
      duration_minutes: formData.get("duration_minutes"),
      scheduled_at: formData.get("scheduled_at")?.toString(),
      price_cad: formData.get("price_cad"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { service_id, title, type, duration_minutes, scheduled_at, price_cad } =
      parsed.data;
   const description = parsed.data.description?.trim() || null;

   const cents = cadStringToCents(price_cad);
   if (cents === null) {
      return { errors: { price_cad: ["Enter a valid price in CAD"] } };
   }

   const sched = parseScheduledAtJson(scheduled_at ?? null, type);
   if (!sched.ok) {
      return { errors: { scheduled_at: [sched.error] } };
   }

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, service_id))
      .limit(1);

   if (!row) {
      return { errors: { _form: ["Service not found"] } };
   }

   if (row.status !== "active") {
      return {
         errors: {
            _form: ["Unarchive this service before editing."],
         },
      };
   }

   try {
      await updateStripeProductDetails(row.stripeProductId, {
         title,
         description,
      });

      const latest = await getLatestCadOneTimePrice(row.stripeProductId);
      const currentCents = latest?.unit_amount ?? null;
      if (currentCents === null || currentCents !== cents) {
         await replaceCadOneTimePrice(row.stripeProductId, cents);
      }

      await db
         .update(services)
         .set({
            title,
            description,
            type,
            scheduledAt: sched.value,
            durationMinutes: duration_minutes,
            updatedAt: new Date(),
         })
         .where(eq(services.id, service_id));

      await syncStripeProduct({
         stripeProductId: row.stripeProductId,
         status: row.status,
         isOffered: row.isOffered,
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

   revalidatePath("/dashboard/services");
   return { message: "Service updated." };
}

const idOnlySchema = z.object({
   service_id: z.string().uuid(),
});

export async function archiveService(formData: FormData): Promise<void> {
   try {
      await requireAdmin();
   } catch {
      return;
   }

   const parsed = idOnlySchema.safeParse({
      service_id: formData.get("service_id"),
   });
   if (!parsed.success) return;

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, parsed.data.service_id))
      .limit(1);
   if (!row || row.status !== "active") return;

   try {
      await db
         .update(services)
         .set({ status: "archived", updatedAt: new Date() })
         .where(eq(services.id, row.id));
      await syncStripeProduct({
         stripeProductId: row.stripeProductId,
         status: "archived",
         isOffered: row.isOffered,
      });
   } catch (e) {
      console.error(e);
      return;
   }

   revalidatePath("/dashboard/services");
}

export async function unarchiveService(formData: FormData): Promise<void> {
   try {
      await requireAdmin();
   } catch {
      return;
   }

   const parsed = idOnlySchema.safeParse({
      service_id: formData.get("service_id"),
   });
   if (!parsed.success) return;

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, parsed.data.service_id))
      .limit(1);
   if (!row || row.status !== "archived") return;

   try {
      await db
         .update(services)
         .set({ status: "active", updatedAt: new Date() })
         .where(eq(services.id, row.id));
      await syncStripeProduct({
         stripeProductId: row.stripeProductId,
         status: "active",
         isOffered: row.isOffered,
      });
   } catch (e) {
      console.error(e);
      return;
   }

   revalidatePath("/dashboard/services");
}

export async function deleteService(formData: FormData): Promise<void> {
   try {
      await requireAdmin();
   } catch {
      return;
   }

   const parsed = idOnlySchema.safeParse({
      service_id: formData.get("service_id"),
   });
   if (!parsed.success) return;

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, parsed.data.service_id))
      .limit(1);
   if (!row || row.status !== "archived") return;

   try {
      await db
         .update(services)
         .set({ status: "deleted", updatedAt: new Date() })
         .where(eq(services.id, row.id));
      await syncStripeProduct({
         stripeProductId: row.stripeProductId,
         status: "deleted",
         isOffered: row.isOffered,
      });
   } catch (e) {
      console.error(e);
      return;
   }

   revalidatePath("/dashboard/services");
}

const offeredSchema = z.object({
   service_id: z.string().uuid(),
   offered: z.enum(["true", "false"]),
});

export async function setServiceOffered(formData: FormData): Promise<void> {
   try {
      await requireAdmin();
   } catch {
      return;
   }

   const parsed = offeredSchema.safeParse({
      service_id: formData.get("service_id"),
      offered: formData.get("offered"),
   });
   if (!parsed.success) return;

   const isOffered = parsed.data.offered === "true";

   const [row] = await db
      .select()
      .from(services)
      .where(eq(services.id, parsed.data.service_id))
      .limit(1);
   if (!row || row.status !== "active") return;

   try {
      await db
         .update(services)
         .set({ isOffered, updatedAt: new Date() })
         .where(eq(services.id, row.id));
      await syncStripeProduct({
         stripeProductId: row.stripeProductId,
         status: "active",
         isOffered,
      });
   } catch (e) {
      console.error(e);
      return;
   }

   revalidatePath("/dashboard/services");
}
