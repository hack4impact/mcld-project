import { NextRequest, NextResponse } from "next/server";
import {
  getActiveCouponForCustomerProduct,
  getLiveSubscription,
  getOrCreateStripeCustomer,
  stripe,
  syncStripeData,
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

  const { priceId, returnTo } = await request.json();

  if (!priceId) {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 },
    );
  }

  const isSafeReturnPath =
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//");
  const successPath = isSafeReturnPath ? returnTo : "/checkout/success";

  const stripeCustomerId = await getOrCreateStripeCustomer(
    user.id,
    user.email!,
  );

  const price = await stripe.prices.retrieve(priceId);
  const stripeProductId = price.product as string;
  const mode = price.type === "recurring" ? "subscription" : "payment";

  if (mode === "subscription") {
    const live = await getLiveSubscription(stripeCustomerId);
    if (live) {
      await syncStripeData(stripeCustomerId);
      const error =
        live.status === "active" || live.status === "trialing"
          ? "You already have an active membership."
          : "Your membership payment is overdue. Please update your payment method.";
      return NextResponse.json({ error }, { status: 409 });
    }

    const openSessions = await stripe.checkout.sessions.list({
      customer: stripeCustomerId,
      status: "open",
      limit: 100,
    });
    for (const s of openSessions.data) {
      if (s.mode === "subscription") {
        await stripe.checkout.sessions.expire(s.id);
      }
    }
  }

  const couponId = await getActiveCouponForCustomerProduct({
    customerId: stripeCustomerId,
    productId: stripeProductId,
  });

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(couponId
      ? { discounts: [{ coupon: couponId }] }
      : {}),
    success_url: `${request.nextUrl.origin}${successPath}`,
    cancel_url: `${request.nextUrl.origin}/checkout/cancel`,
  });

  return NextResponse.json({ url: session.url });
}
