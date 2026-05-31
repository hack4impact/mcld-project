import { Suspense } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { syncStripeData } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export default function CheckoutSuccessPage() {
   return (
      <Suspense fallback={<SuccessShell syncing />}>
         <SyncAndConfirm />
      </Suspense>
   );
}

async function SyncAndConfirm() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return <SuccessShell />;

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
   });
   if (profile?.stripeCustomerId) {
      await syncStripeData(profile.stripeCustomerId);
   }

   return <SuccessShell />;
}

function SuccessShell({ syncing = false }: { syncing?: boolean }) {
   return (
      <div className="w-full max-w-md text-center">
         <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="size-8 text-green-600" />
         </div>
         <h1 className="mb-2 font-heading text-2xl font-semibold">
            Payment successful
         </h1>
         <p className="mb-8 text-sm text-muted-foreground">
            {syncing
               ? "Finalizing your purchase…"
               : "Thanks - your purchase is confirmed. You'll receive a receipt by email shortly."}
         </p>
         <Button asChild>
            <Link href="/">Back to home</Link>
         </Button>
      </div>
   );
}
