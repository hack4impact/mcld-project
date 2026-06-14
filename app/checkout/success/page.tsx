import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { Loader2 } from "lucide-react";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { syncStripeData } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

import { SuccessCheck } from "./success-check";

export default function CheckoutSuccessPage() {
   return (
      <Suspense fallback={<SyncingShell />}>
         <SyncAndConfirm />
      </Suspense>
   );
}

async function SyncAndConfirm() {
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

   return <SuccessShell />;
}

function SyncingShell() {
   return (
      <div className="w-full max-w-md text-center">
         <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
         </div>
         <h1 className="mb-2 font-heading text-2xl font-semibold">
            Payment successful
         </h1>
         <p className="text-sm text-muted-foreground">
            Finalizing your purchase…
         </p>
      </div>
   );
}

function SuccessShell() {
   return (
      <div className="w-full max-w-md text-center">
         <SuccessCheck />
         <h1 className="mb-2 font-heading text-2xl font-semibold">
            Payment successful
         </h1>
         <p className="text-sm text-muted-foreground">
            Thanks - your purchase is confirmed. You&apos;ll receive a receipt
            by email shortly.
         </p>
      </div>
   );
}
