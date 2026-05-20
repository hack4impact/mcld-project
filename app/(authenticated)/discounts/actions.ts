"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
   applyProductDiscountToCustomer,
   removeProductDiscountFromCustomer,
   listStripeServices,
   listActiveDiscountsForCustomer,
} from "@/lib/stripe";
import type { ActiveDiscount, DiscountService } from "@/components/discount-modal";

export type DiscountActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   data?: Record<string, string>;
} | null;

const applyDiscountSchema = z
   .object({
      product_id: z.string().min(1, "Product is required"),
      customer_id: z.string().min(1, "Customer is required"),
      usage_limit: z.coerce
         .number()
         .int("Usage limit must be an integer")
         .min(1, "Usage limit must be at least 1"),
      discount_type: z.enum(["percent", "amount"]),
      discount_value: z.coerce
         .number()
         .int("Discount value must be an integer")
         .positive("Discount value must be positive"),
      currency: z.string().trim().length(3).optional(),
   })
   .superRefine((value, ctx) => {
      if (value.discount_type === "percent" && value.discount_value > 100) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["discount_value"],
            message: "Percent discount cannot exceed 100",
         });
      }

      if (value.discount_type === "amount" && !value.currency) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["currency"],
            message: "Currency is required for amount discounts",
         });
      }
   });

const removeDiscountSchema = z.object({
   product_id: z.string().min(1, "Product is required"),
   customer_id: z.string().min(1, "Customer is required"),
});

export async function applyDiscountToCustomerProduct(
   _prev: DiscountActionState,
   formData: FormData,
): Promise<DiscountActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = applyDiscountSchema.safeParse({
      product_id: formData.get("product_id"),
      customer_id: formData.get("customer_id"),
      usage_limit: formData.get("usage_limit"),
      discount_type: formData.get("discount_type"),
      discount_value: formData.get("discount_value"),
      currency: formData.get("currency") ?? undefined,
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const discount =
      parsed.data.discount_type === "percent"
         ? { percentOff: parsed.data.discount_value }
         : {
              amountOffCents: parsed.data.discount_value,
              currency: (parsed.data.currency ?? "cad").toLowerCase(),
           };

   try {
      const result = await applyProductDiscountToCustomer({
         productId: parsed.data.product_id,
         customerId: parsed.data.customer_id,
         usageLimit: parsed.data.usage_limit,
         discount,
      });

      return {
         message: "Discount applied.",
         data: {
            coupon_id: result.couponId,
         },
      };
   } catch (error) {
      return {
         errors: {
            _form: [
               error instanceof Error ? error.message : "Could not apply discount",
            ],
         },
      };
   }
}

export async function removeDiscountFromCustomerProduct(
   _prev: DiscountActionState,
   formData: FormData,
): Promise<DiscountActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = removeDiscountSchema.safeParse({
      product_id: formData.get("product_id"),
      customer_id: formData.get("customer_id"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   try {
      const { removed } = await removeProductDiscountFromCustomer({
         productId: parsed.data.product_id,
         customerId: parsed.data.customer_id,
      });

      return {
         message:
            removed > 0
               ? "Discount removed."
               : "No active discount found for this customer and product.",
      };
   } catch (error) {
      return {
         errors: {
            _form: [
               error instanceof Error ? error.message : "Could not remove discount",
            ],
         },
      };
   }
}

export async function getUserDiscountModalData(stripeCustomerId: string): Promise<{
   services: DiscountService[];
   discounts: ActiveDiscount[];
}> {
   try {
      await requireAdmin();
   } catch {
      return { services: [], discounts: [] };
   }

   const [rawServices, rawDiscounts] = await Promise.all([
      listStripeServices(),
      listActiveDiscountsForCustomer(stripeCustomerId),
   ]);

   const nameMap = new Map(rawServices.map((s) => [s.id, s.name]));

   const discounts: ActiveDiscount[] = rawDiscounts.map((d) => ({
      id: d.productId,
      service: nameMap.get(d.productId) ?? d.productId,
      type: d.percentOff !== null ? "Percent" : "Amount",
      value:
         d.percentOff !== null
            ? `${d.percentOff}%`
            : `$${((d.amountOffCents ?? 0) / 100).toFixed(2)}`,
      used:
         d.maxRedemptions !== null
            ? `${d.timesRedeemed} / ${d.maxRedemptions}`
            : String(d.timesRedeemed),
   }));

   return { services: rawServices, discounts };
}
