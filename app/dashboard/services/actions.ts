"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin/require-admin";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { getServiceById } from "@/lib/services/list-services";
import {
   createStripeCatalogItem,
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

function revalidateServicePaths(type: "programs" | "private_lessons") {
   revalidatePath(`/dashboard/services/${type}`);
   revalidatePath("/dashboard/services/programs");
   revalidatePath("/dashboard/services/private-lessons");
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
      const message =
         parsed.error.flatten().fieldErrors.name?.[0] ??
         parsed.error.flatten().fieldErrors.priceDollars?.[0] ??
         "Invalid form data";
      return { error: message };
   }

   const data = parsed.data;

   try {
      const { productId } = await createStripeCatalogItem({
         name: data.name,
         description: data.description,
         priceCents: dollarsToCents(data.priceDollars),
      });

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

      revalidateServicePaths(data.type);
      return { success: true };
   } catch (err) {
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
      return { error: "Invalid form data" };
   }

   const data = parsed.data;
   const existing = await getServiceById(serviceId);

   if (!existing) {
      return { error: "Service not found" };
   }

   try {
      await updateStripeCatalogItem({
         productId: existing.row.stripeProductId,
         name: data.name,
         description: data.description,
         priceCents: dollarsToCents(data.priceDollars),
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

      revalidateServicePaths(data.type);
      return { success: true };
   } catch (err) {
      console.error("updateService", err);
      return {
         error:
            err instanceof Error ? err.message : "Failed to update service",
      };
   }
}

const ALLOWED_STATUS_TRANSITIONS: Record<
   "active" | "disabled" | "archived",
   Array<"active" | "disabled" | "archived">
> = {
   active: ["disabled"],
   disabled: ["active", "archived"],
   archived: [],
};

export async function updateServiceStatus(
   serviceId: string,
   status: "active" | "disabled" | "archived",
   type: "programs" | "private_lessons",
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

      revalidateServicePaths(type);
      return { success: true };
   } catch (err) {
      console.error("updateServiceStatus", err);
      return { error: "Failed to update status" };
   }
}
