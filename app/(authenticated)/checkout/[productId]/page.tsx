import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { userHasActiveSubscription } from "@/lib/stripe";
import { getService } from "@/app/(authenticated)/services/queries";

import { CheckoutFlow } from "./checkout-flow";

export default async function CheckoutPage({
   params,
}: {
   params: Promise<{ productId: string }>;
}) {
   const { productId } = await params;

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) {
      return <NotAvailable message="You must be signed in to check out." />;
   }

   const service = await getService(productId);
   if (!service || service.status !== "active") {
      return <NotAvailable message="This product isn't available." />;
   }

   const hasActiveSubscription = await userHasActiveSubscription(user.id);

   return (
      <main className="mx-auto w-full max-w-xl p-6">
         <CheckoutFlow
            service={service}
            hasActiveSubscription={hasActiveSubscription}
         />
      </main>
   );
}

function NotAvailable({ message }: { message: string }) {
   return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
         <Card>
            <CardHeader>
               <CardTitle>Not available</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">{message}</p>
               <Button asChild variant="outline">
                  <Link href="/">Go back home</Link>
               </Button>
            </CardContent>
         </Card>
      </main>
   );
}
