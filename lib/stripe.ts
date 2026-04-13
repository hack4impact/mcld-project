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
