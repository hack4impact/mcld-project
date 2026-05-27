"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { coachingSessions, serviceBookings, services } from "@/lib/db/schema";
import { getOrCreateStripeCustomer, stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export type CheckoutResult = { url: string } | { error: string };

async function getDefaultPriceId(stripeProductId: string): Promise<string> {
   const product = await stripe.products.retrieve(stripeProductId);
   const defaultPriceId = product.default_price;
   if (!defaultPriceId) {
      throw new Error(`Stripe product ${stripeProductId} has no default price`);
   }
   return defaultPriceId as string;
}

async function getRequestOrigin(): Promise<string> {
   const origin = (await headers()).get("origin");
   if (!origin) {
      throw new Error("Missing request origin");
   }
   return origin;
}

type CreateSessionResult =
   | { session: Stripe.Checkout.Session }
   | { error: string };

async function createStripeCheckoutSession(params: {
   userId: string;
   email: string;
   stripeProductId: string;
   metadata: Record<string, string>;
}): Promise<CreateSessionResult> {
   const priceId = await getDefaultPriceId(params.stripeProductId);

   const customerId = await getOrCreateStripeCustomer(
      params.userId,
      params.email,
   );
   const origin = await getRequestOrigin();

   const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: params.metadata,
   });

   if (!session.url)
      return { error: "Stripe did not return a checkout URL" };
   return { session };
}

export async function checkoutServiceBooking({
   serviceId,
}: {
   serviceId: string;
}): Promise<CheckoutResult> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
   });
   if (!service) return { error: "Service not found" };
   if (service.status !== "active")
      return { error: "Service is not available" };
   if (service.type !== "programs")
      return { error: "Service is not a program" };

   const [row] = await db
      .insert(serviceBookings)
      .values({
         userId: user.id,
         serviceId: service.id,
         status: "awaiting_payment",
      })
      .returning({ id: serviceBookings.id });

   const result = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email!,
      stripeProductId: service.stripeProductId,
      metadata: {
         type: "program",
         bookingId: row.id,
      },
   });
   if ("error" in result) {
      await db.delete(serviceBookings).where(eq(serviceBookings.id, row.id));
      return { error: result.error };
   }

   await db
      .update(serviceBookings)
      .set({ stripeOrderId: result.session.id })
      .where(eq(serviceBookings.id, row.id));

   return { url: result.session.url! };
}

export async function checkoutDonation(): Promise<CheckoutResult> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const donationProductId = process.env.STRIPE_DONATION_PRODUCT_ID;
   if (!donationProductId) return { error: "Donation product not configured" };

   const result = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email!,
      stripeProductId: donationProductId,
      metadata: { type: "donation" },
   });
   if ("error" in result) return { error: result.error };

   return { url: result.session.url! };
}

export async function checkoutCoachingSession({
   coachingSessionId,
}: {
   coachingSessionId: string;
}): Promise<CheckoutResult> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return { error: "Not authenticated" };

   const row = await db.query.coachingSessions.findFirst({
      where: and(
         eq(coachingSessions.id, coachingSessionId),
         eq(coachingSessions.userId, user.id),
      ),
   });
   if (!row) return { error: "Coaching session not found" };
   if (row.status !== "awaiting_payment")
      return { error: "Coaching session is not awaiting payment" };

   const service = await db.query.services.findFirst({
      where: eq(services.id, row.serviceId),
   });
   if (!service) return { error: "Service not found" };

   const result = await createStripeCheckoutSession({
      userId: user.id,
      email: user.email!,
      stripeProductId: service.stripeProductId,
      metadata: {
         type: "private_lesson",
         coachingSessionId: row.id,
      },
   });
   if ("error" in result) {
      await db
         .delete(coachingSessions)
         .where(eq(coachingSessions.id, row.id));
      return { error: result.error };
   }

   await db
      .update(coachingSessions)
      .set({ stripeOrderId: result.session.id })
      .where(eq(coachingSessions.id, row.id));

   return { url: result.session.url! };
}

