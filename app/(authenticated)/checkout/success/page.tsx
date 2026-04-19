import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { syncStripeData } from "@/lib/stripe";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default function CheckoutSuccessPage() {
   return (
      <Suspense>
         <SyncAndRedirect />
      </Suspense>
   );
}

async function SyncAndRedirect(): Promise<never> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
   });

   if (!profile?.stripeCustomerId) {
      redirect("/");
   }

   await syncStripeData(profile.stripeCustomerId);

   redirect("/");
}
