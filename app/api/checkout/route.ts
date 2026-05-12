import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCouponForCustomerProduct,
  getOrCreateStripeCustomer,
  stripe,
} from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { priceId, mode = "subscription" } = await request.json();

  if (!priceId) {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 },
    );
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(
    user.id,
    user.email!,
  );

  const price = await stripe.prices.retrieve(priceId);
  const stripeProductId = price.product as string;

  const couponId = await getActiveCouponForCustomerProduct({
    customerId: stripeCustomerId,
    productId: stripeProductId,
  });

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: mode as "subscription" | "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(couponId
      ? { discounts: [{ coupon: couponId }] }
      : {}),
    success_url: `${request.nextUrl.origin}/checkout/success`,
    cancel_url: `${request.nextUrl.origin}/checkout/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
