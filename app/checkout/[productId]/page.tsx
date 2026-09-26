import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/subscribe-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import { getProductDiscountForUser, userNeedsSubscriptionFor } from "@/lib/stripe";
import { getService } from "@/app/(authenticated)/services/queries";

import { CheckoutFlow } from "./checkout-flow";
import { Check, X } from "lucide-react";

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

   if (await userNeedsSubscriptionFor(service, user.id)) {
      return <MembershipRequired productId={productId} />;
   }

   const discount = await getProductDiscountForUser({
      userId: user.id,
      productId: service.stripeProductId,
   });

   return (
      <div className="mx-auto w-full max-w-4xl">
         <CheckoutFlow service={service} discount={discount} />
      </div>
   );
}

const MEMBERSHIP_PERKS = [
   "Booking private lessons and programs",
   "Member pricing on every service",
   "Cancel anytime",
];

function MembershipRequired({ productId }: { productId: string }) {
   return (
      <Card className="mx-auto w-full max-w-xl overflow-hidden">
         <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
               <h1 className="font-heading text-2xl font-semibold leading-tight">
                  Members only
               </h1>
               <Badge variant="secondary" className="shrink-0">
                  Membership needed
               </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
               This service requires an active membership, which includes:
            </p>
         </CardHeader>
         <CardContent className="space-y-4">
            <Separator />
            <ul className="space-y-3 text-sm">
               {MEMBERSHIP_PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                     <Check className="size-4 shrink-0 text-success" />
                     {perk}
                  </li>
               ))}
            </ul>
            <CheckoutButton
               priceId={process.env.STRIPE_PRICE_ID!}
               mode="subscription"
               label="Subscribe"
               returnTo={`/checkout/${productId}/subscribed`}
            />
         </CardContent>
      </Card>
   );
}

function NotAvailable({ message }: { message: string }) {
   return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
         <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <X className="size-7 text-destructive" strokeWidth={2.5} />
         </span>
         <h1 className="text-xl font-semibold text-foreground">{message}</h1>
         <Button asChild>
            <Link href="/">Go back home</Link>
         </Button>
      </div>
   );
}
