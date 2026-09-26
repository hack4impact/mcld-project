import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/subscribe-button";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="mx-auto w-full max-w-sm">
         <CardContent className="flex flex-col gap-4">
            <Badge variant="secondary" className="self-start">
               Membership needed
            </Badge>
            <p className="text-sm leading-relaxed text-muted-foreground">
               This is a members-only service. An active membership includes:
            </p>
            <ul className="flex flex-col gap-2">
               {MEMBERSHIP_PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm">
                     <Check className="size-3.5 shrink-0 text-ring" />
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

function NotAvailable({
   message,
   children,
}: {
   message: string;
   children?: ReactNode;
}) {
   return (
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md">
         <h1 className="text-xl font-bold text-muted-foreground">
            <span className="flex items-center gap-2 text-center">
               <X className="size-8 text-red-600" />
               {message}
            </span>
         </h1>
         {children ?? (
            <Button asChild>
               <Link href="/">Go back home</Link>
            </Button>
         )}
      </div>
   );
}
