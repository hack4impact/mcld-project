"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/require-admin";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { getServiceById } from "@/lib/services/list-services";
import {
   createStripeCatalogItem,
   deactivateStripeProduct,
   updateStripeCatalogItem,
} from "@/lib/services/stripe-catalog";
import {
   dollarsToCents,
   parseServiceForm,
} from "@/app/dashboard/services/schema";

export type ServiceActionState = {
   error?: string;
   success?: boolean;
} | null;

function revalidateServicePaths() {
   revalidatePath("/dashboard/services/programs");
   revalidatePath("/dashboard/services/private-lessons");
}

function validationErrorMessage(
   fieldErrors: Record<string, string[] | undefined>,
) {
   return (
      fieldErrors.name?.[0] ??
      fieldErrors.priceDollars?.[0] ??
      fieldErrors.durationMinutes?.[0] ??
      fieldErrors.startDate?.[0] ??
      fieldErrors.endDate?.[0] ??
      "Invalid form data"
   );
}

export async function saveService(
   prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   const serviceId = formData.get("serviceId");
   if (typeof serviceId === "string" && serviceId.length > 0) {
      return updateService(prev, formData);
   }
   return createService(prev, formData);
}

export async function createService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   await requireAdmin();

   const parsed = parseServiceForm(formData);
   if (!parsed.success) {
      return { error: validationErrorMessage(parsed.error.flatten().fieldErrors) };
   }

   const data = parsed.data;
   let productId: string | undefined;

   try {
      const created = await createStripeCatalogItem({
         name: data.name,
         description: data.description,
         priceCents: dollarsToCents(data.priceDollars),
      });
      productId = created.productId;

      await db.insert(services).values({
         type: data.type,
         durationMinutes: data.durationMinutes,
         stripeProductId: productId,
         status: "active",
         startDate: data.type === "programs" ? data.startDate : null,
         endDate: data.type === "programs" ? data.endDate : null,
         coachId:
            data.type === "private_lessons" && data.coachId
               ? data.coachId
               : null,
      });

      revalidateServicePaths();
      return { success: true };
   } catch (err) {
      if (productId) {
         try {
            await deactivateStripeProduct(productId);
         } catch (cleanupErr) {
            console.error("createService cleanup", cleanupErr);
         }
      }
      console.error("createService", err);
      return {
         error:
            err instanceof Error ? err.message : "Failed to create service",
      };
   }
}

export async function updateService(
   _prev: ServiceActionState,
   formData: FormData,
): Promise<ServiceActionState> {
   await requireAdmin();

   const serviceId = formData.get("serviceId");
   if (typeof serviceId !== "string" || !serviceId) {
      return { error: "Missing service id" };
   }

   const parsed = parseServiceForm(formData);
   if (!parsed.success) {
      return { error: validationErrorMessage(parsed.error.flatten().fieldErrors) };
   }

   const data = parsed.data;
   const existing = await getServiceById(serviceId);

   if (!existing) {
      return { error: "Service not found" };
   }

   if (existing.row.type !== data.type) {
      return { error: "Service type cannot be changed" };
   }

   const newPriceCents = dollarsToCents(data.priceDollars);
   const priceChanged = existing.catalog.priceCents !== newPriceCents;

   try {
      await updateStripeCatalogItem({
         productId: existing.row.stripeProductId,
         name: data.name,
         description: data.description,
         priceCents: priceChanged ? newPriceCents : undefined,
      });

      await db
         .update(services)
         .set({
            durationMinutes: data.durationMinutes,
            startDate: data.type === "programs" ? data.startDate : null,
            endDate: data.type === "programs" ? data.endDate : null,
            coachId:
               data.type === "private_lessons" && data.coachId
                  ? data.coachId
                  : null,
            updatedAt: new Date().toISOString(),
         })
         .where(eq(services.id, serviceId));

      revalidateServicePaths();
      return { success: true };
   } catch (err) {
      console.error("updateService", err);
      return {
         error:
            err instanceof Error ? err.message : "Failed to update service",
      };
   }
}

type MutableServiceStatus = "active" | "disabled" | "archived";

const ALLOWED_STATUS_TRANSITIONS: Record<
   MutableServiceStatus | "deleted",
   MutableServiceStatus[]
> = {
   active: ["disabled"],
   disabled: ["active", "archived"],
   archived: [],
   deleted: [],
};

export async function updateServiceStatus(
   serviceId: string,
   status: MutableServiceStatus,
): Promise<ServiceActionState> {
   await requireAdmin();

   const existing = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
   });

   if (!existing) {
      return { error: "Service not found" };
   }

   const current = existing.status as keyof typeof ALLOWED_STATUS_TRANSITIONS;
   if (!ALLOWED_STATUS_TRANSITIONS[current]?.includes(status)) {
      return {
         error: `Cannot move from ${current} to ${status}`,
      };
   }

   try {
      await db
         .update(services)
         .set({
            status,
            updatedAt: new Date().toISOString(),
         })
         .where(eq(services.id, serviceId));

      revalidateServicePaths();
      return { success: true };
   } catch (err) {
      console.error("updateServiceStatus", err);
      return { error: "Failed to update status" };
   }
}
