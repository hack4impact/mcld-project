import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { syncStripeData } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

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
