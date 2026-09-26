import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { syncStripeData } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

// Stripe redirects here right after a subscription checkout instead of
// straight back to the service's checkout page. userHasActiveSubscription
// only reads from our subscriptions table, which the Stripe webhook updates
// asynchronously - the webhook can easily lose that race against the
// redirect, so this step syncs synchronously first (same approach as
// /checkout/success) before sending the user back to the service.
export default async function SubscribedPage({
   params,
}: {
   params: Promise<{ productId: string }>;
}) {
   const { productId } = await params;

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (user) {
      const profile = await db.query.profiles.findFirst({
         where: eq(profiles.id, user.id),
      });
      if (profile?.stripeCustomerId) {
         await syncStripeData(profile.stripeCustomerId);
      }
   }

   redirect(`/checkout/${productId}`);
}
