import { NextRequest, NextResponse } from "next/server";
import { deleteCouponIfExhausted, stripe, syncStripeData } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
   coachingSessions,
   profiles,
   purchases,
   serviceBookings,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { notifyCoachOfBooking } from "@/app/scheduling/notifications";

const allowedEvents: Stripe.Event.Type[] = [
   "checkout.session.completed",
   "customer.subscription.created",
   "customer.subscription.updated",
   "customer.subscription.deleted",
   "customer.subscription.paused",
   "customer.subscription.resumed",
   "invoice.paid",
   "invoice.payment_failed",
   "invoice.payment_succeeded",
];

export async function POST(request: NextRequest) {
   const body = await request.text();
   const signature = request.headers.get("stripe-signature");

   if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
   }

   let event: Stripe.Event;
   try {
      event = stripe.webhooks.constructEvent(
         body,
         signature,
         process.env.STRIPE_WEBHOOK_SECRET!,
      );
   } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
   }

   if (!allowedEvents.includes(event.type)) {
      return NextResponse.json({ received: true });
   }

   if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};

      if (metadata.type === "private_lesson" && metadata.coachingSessionId) {
         const updated = await db
            .update(coachingSessions)
            .set({ status: "pending", stripeOrderId: session.id })
            .where(
               and(
                  eq(coachingSessions.id, metadata.coachingSessionId),
                  eq(coachingSessions.status, "awaiting_payment"),
               ),
            )
            .returning({ id: coachingSessions.id });

         const transitioned = updated[0];
         if (transitioned) {
            await notifyCoachOfBooking(transitioned.id);
         }
         return NextResponse.json({ received: true });
      }

      if (metadata.type === "program" && metadata.bookingId) {
         await db
            .update(serviceBookings)
            .set({ status: "confirmed", stripeOrderId: session.id })
            .where(
               and(
                  eq(serviceBookings.id, metadata.bookingId),
                  eq(serviceBookings.status, "awaiting_payment"),
               ),
            );
         return NextResponse.json({ received: true });
      }

      for (const d of session.discounts ?? []) {
         const couponId =
            typeof d.coupon === "string" ? d.coupon : d.coupon?.id;
         if (couponId) {
            await deleteCouponIfExhausted(couponId);
         }
      }

      if (session.mode === "payment" && session.customer) {
         const customerId = session.customer as string;

         const profile = await db.query.profiles.findFirst({
            where: eq(profiles.stripeCustomerId, customerId),
         });

         if (profile) {
            const lineItems = await stripe.checkout.sessions.listLineItems(
               session.id,
               { limit: 1 },
            );
            const item = lineItems.data[0];
            if (item) {
               await db.insert(purchases).values({
                  userId: profile.id,
                  stripePriceId: item.price?.id ?? "",
                  stripeSessionId: session.id,
                  productName: item.description ?? "Product",
                  amount: session.amount_total ?? 0,
                  currency: session.currency ?? "cad",
               });
            }
         }

         return NextResponse.json({ received: true });
      }
   }

   const { customer: customerId } = event.data.object as {
      customer: string;
   };

   if (typeof customerId !== "string") {
      console.error(
         `[STRIPE WEBHOOK] No customer ID on event type: ${event.type}`,
      );
      return NextResponse.json({ received: true });
   }

   await syncStripeData(customerId);

   return NextResponse.json({ received: true });
}
