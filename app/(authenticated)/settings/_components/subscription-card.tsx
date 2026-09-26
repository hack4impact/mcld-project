import { Badge } from "@/components/ui/badge";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { CheckoutButton } from "@/components/subscribe-button";
import type { SubscriptionDetails } from "@/lib/stripe";

/** The member's subscription, or a Subscribe button when they have none. */
export function SubscriptionCard({
   subscription,
}: {
   subscription: SubscriptionDetails;
}) {
   return (
      <Card>
         <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
               <CardTitle className="text-base font-semibold">
                  Subscription
               </CardTitle>
               {subscription && (
                  <Badge variant="success" className="shrink-0">
                     {subscription.status === "trialing" ? "Trial" : "Active"}
                  </Badge>
               )}
            </div>
            <CardDescription>
               {subscription
                  ? "Your current plan"
                  : "Subscribe to unlock members-only services"}
            </CardDescription>
         </CardHeader>
         <CardContent className="flex flex-col gap-4">
            {subscription ? (
               <>
                  <dl className="space-y-3 text-sm">
                     <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Plan</dt>
                        <dd className="text-right font-medium">
                           {subscription.planName}
                        </dd>
                     </div>
                     <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Price</dt>
                        <dd className="font-medium">
                           ${(subscription.priceAmount / 100).toFixed(2)}/
                           {subscription.priceInterval}
                        </dd>
                     </div>
                     {subscription.paymentMethodBrand && (
                        <div className="flex items-center justify-between gap-3">
                           <dt className="text-muted-foreground">Payment</dt>
                           <dd className="font-medium capitalize">
                              {subscription.paymentMethodBrand} ••••{" "}
                              {subscription.paymentMethodLast4}
                           </dd>
                        </div>
                     )}
                  </dl>
                  {subscription.cancelAtPeriodEnd && (
                     <p className="text-sm text-warning">
                        Cancels at end of billing period
                     </p>
                  )}
               </>
            ) : (
               <CheckoutButton
                  priceId={process.env.STRIPE_PRICE_ID!}
                  label="Subscribe"
               />
            )}
         </CardContent>
      </Card>
   );
}
