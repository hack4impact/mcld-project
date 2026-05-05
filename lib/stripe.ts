import Stripe from "stripe";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
   apiVersion: "2026-03-25.dahlia",
});

export async function getOrCreateStripeCustomer(userId: string, email: string) {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
   });

   if (profile?.stripeCustomerId) {
      return profile.stripeCustomerId;
   }

   const customer = await stripe.customers.create({
      email,
      metadata: { userId },
   });

   await db
      .update(profiles)
      .set({ stripeCustomerId: customer.id })
      .where(eq(profiles.id, userId));

   return customer.id;
}

export async function syncStripeData(stripeCustomerId: string) {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.stripeCustomerId, stripeCustomerId),
   });

   if (!profile) {
      console.error("No profile found for Stripe customer:", stripeCustomerId);
      return null;
   }

   const stripeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
   });

   if (stripeSubscriptions.data.length === 0) {
      await db
         .insert(subscriptions)
         .values({
            userId: profile.id,
            status: "none",
         })
         .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
               status: "none",
               stripeSubscriptionId: null,
               stripePriceId: null,
               cancelAtPeriodEnd: false,
               paymentMethodBrand: null,
               paymentMethodLast4: null,
               updatedAt: new Date(),
            },
         });
      return { status: "none" as const };
   }

   const sub = stripeSubscriptions.data[0];
   const paymentMethod =
      sub.default_payment_method as Stripe.PaymentMethod | null;

   const subData = {
      stripeSubscriptionId: sub.id,
      status: sub.status,
      stripePriceId: sub.items.data[0].price.id,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      paymentMethodBrand: paymentMethod?.card?.brand ?? null,
      paymentMethodLast4: paymentMethod?.card?.last4 ?? null,
      updatedAt: new Date(),
   };

   await db
      .insert(subscriptions)
      .values({
         userId: profile.id,
         ...subData,
      })
      .onConflictDoUpdate({
         target: subscriptions.userId,
         set: subData,
      });

   return subData;
}

export type SubscriptionDetails = {
   status: string;
   planName: string;
   priceAmount: number;
   priceInterval: string;
   cancelAtPeriodEnd: boolean;
   paymentMethodBrand: string | null;
   paymentMethodLast4: string | null;
} | null;

export async function getSubscriptionDetails(
   userId: string,
): Promise<SubscriptionDetails> {
   const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
   });

   if (!subscription || subscription.status !== "active") {
      return null;
   }

   if (!subscription.stripePriceId) {
      return null;
   }

   const price = await stripe.prices.retrieve(subscription.stripePriceId, {
      expand: ["product"],
   });

   const product = price.product as Stripe.Product;

   return {
      status: subscription.status,
      planName: product.name,
      priceAmount: price.unit_amount ?? 0,
      priceInterval: price.recurring?.interval ?? "month",
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      paymentMethodBrand: subscription.paymentMethodBrand,
      paymentMethodLast4: subscription.paymentMethodLast4,
   };
}

export async function createProduct(params: {
   name: string;
   description: string;
}): Promise<{ productId: string }> {
   const product = await stripe.products.create({
      name: params.name,
      description: params.description,
   });
   return { productId: product.id };
}

export async function updateProduct(
   productId: string,
   params: { name?: string; description?: string; active?: boolean },
): Promise<void> {
   const patch: Stripe.ProductUpdateParams = {};
   if (params.name !== undefined) patch.name = params.name;
   if (params.description !== undefined) patch.description = params.description;
   if (params.active !== undefined) patch.active = params.active;
   if (Object.keys(patch).length === 0) return;
   await stripe.products.update(productId, patch);
}

export async function createPrice(
   productId: string,
   amountCents: number,
): Promise<{ priceId: string }> {
   const price = await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: "cad",
   });
   return { priceId: price.id };
}

export async function deactivateActivePricesForProduct(
   productId: string,
): Promise<void> {
   const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
   });
   for (const p of prices.data) {
      await stripe.prices.update(p.id, { active: false });
   }
}

export type StripeServiceData = {
   title: string;
   description: string;
   priceCents: number | null;
   priceCurrency: string | null;
};

type ManagedProductDiscount = {
   couponId: string;
};

export async function getStripeServiceData(
   productId: string,
): Promise<StripeServiceData | null> {
   const [product, prices] = await Promise.all([
      stripe.products.retrieve(productId),
      stripe.prices.list({ product: productId, active: true, limit: 100 }),
   ]);

   const latestPrice = prices.data.sort(
      (a, b) => b.created - a.created,
   )[0];

   return {
      title: product.name,
      description: product.description ?? "",
      priceCents: latestPrice?.unit_amount ?? null,
      priceCurrency: latestPrice?.currency ?? null,
   };
}

async function getManagedDiscountForCustomerProduct(
   customerId: string,
   productId: string,
): Promise<ManagedProductDiscount | null> {
   const coupons = await stripe.coupons.list({
      limit: 100,
   });

   for (const coupon of coupons.data) {
      const metadata = coupon.metadata ?? {};
      if (metadata.customerId !== customerId) continue;
      if (!coupon.valid) continue;

      const appliesToProducts = coupon.applies_to?.products ?? [];
      if (!appliesToProducts.includes(productId)) continue;

      return {
         couponId: coupon.id,
      };
   }

   return null;
}

export type ProductDiscountConfig =
   | {
        percentOff: number;
        amountOffCents?: never;
        currency?: string;
     }
   | {
        percentOff?: never;
        amountOffCents: number;
        currency: string;
     };

export async function applyProductDiscountToCustomer(input: {
   productId: string;
   customerId: string;
   usageLimit: number;
   discount: ProductDiscountConfig;
}): Promise<{
   couponId: string;
}> {
   const existing = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   if (existing) {
      throw new Error(
         "A discount is already active for this customer and product. Remove it before applying a new one.",
      );
   }

   const couponParams: Stripe.CouponCreateParams = {
      duration: "forever",
      applies_to: { products: [input.productId] },
      max_redemptions: input.usageLimit,
      metadata: {
         productId: input.productId,
         customerId: input.customerId,
      },
   };

   if (input.discount.percentOff !== undefined) {
      couponParams.percent_off = input.discount.percentOff;
   } else {
      couponParams.amount_off = input.discount.amountOffCents;
      couponParams.currency = input.discount.currency;
   }

   const coupon = await stripe.coupons.create(couponParams);

   return {
      couponId: coupon.id,
   };
}

export async function getActiveCouponForCustomerProduct(input: {
   customerId: string;
   productId: string;
}): Promise<string | null> {
   const managed = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   return managed?.couponId ?? null;
}

export async function removeProductDiscountFromCustomer(input: {
   productId: string;
   customerId: string;
}): Promise<{ removed: number }> {
   const managed = await getManagedDiscountForCustomerProduct(
      input.customerId,
      input.productId,
   );
   if (!managed) {
      return { removed: 0 };
   }

   await stripe.coupons.del(managed.couponId);
   return { removed: 1 };
}

export async function deleteCouponIfExhausted(couponId: string): Promise<void> {
   try {
      const coupon = await stripe.coupons.retrieve(couponId);
      if (!coupon.valid) {
         await stripe.coupons.del(couponId);
      }
   } catch (err) {
      console.error(`[STRIPE] Coupon cleanup failed for ${couponId}:`, err);
   }
}
