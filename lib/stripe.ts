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
