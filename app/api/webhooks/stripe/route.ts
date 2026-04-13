import { NextRequest, NextResponse } from "next/server";
import { stripe, syncStripeData } from "@/lib/stripe";
import { db } from "@/lib/db";
import { profiles, purchases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

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
