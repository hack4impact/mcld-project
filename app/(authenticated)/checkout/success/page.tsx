import { Suspense } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";

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
      <div className="flex min-h-screen items-center justify-center px-4">
         <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
               <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
               >
                  <path
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     d="M5 13l4 4L19 7"
                  />
               </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold">Payment successful</h1>
            <p className="mb-8 text-gray-600">
               {syncing
                  ? "Finalizing your purchase…"
                  : "Thanks — your purchase is confirmed. You'll receive a receipt by email shortly."}
            </p>
            <Button asChild>
               <Link href="/">Back to home</Link>
            </Button>
         </div>
      </div>
   );
}
