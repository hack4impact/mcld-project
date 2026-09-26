import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CheckoutButton } from "@/components/subscribe-button";
import { requireUser } from "@/lib/auth/require-user";
import { getSubscriptionDetails } from "@/lib/stripe";

export default function SettingsPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <SettingsContent />
      </Suspense>
   );
}

async function SettingsContent() {
   let userId: string;
   try {
      ({ userId } = await requireUser());
   } catch {
      redirect("/");
   }

   const subscription = await getSubscriptionDetails(userId);

   return (
      <PageShell>
         <PageHeader
            title="Settings"
            description="Manage your account and preferences."
         />

         <Card className="w-full max-w-xl overflow-hidden">
            <CardHeader className="space-y-2">
               <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-semibold leading-tight">
                     Subscription
                  </h2>
                  {subscription && (
                     <Badge variant="success" className="shrink-0">
                        {subscription.status === "trialing"
                           ? "Trial"
                           : "Active"}
                     </Badge>
                  )}
               </div>
               <CardDescription>
                  {subscription
                     ? "Your current plan"
                     : "Subscribe to unlock members-only services"}
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Separator />
               {subscription ? (
                  <>
                     <dl className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                           <dt className="text-muted-foreground">Plan</dt>
                           <dd className="font-medium">
                              {subscription.planName}
                           </dd>
                        </div>
                        <div className="flex items-center justify-between">
                           <dt className="text-muted-foreground">Price</dt>
                           <dd className="font-medium">
                              ${(subscription.priceAmount / 100).toFixed(2)}/
                              {subscription.priceInterval}
                           </dd>
                        </div>
                        {subscription.paymentMethodBrand && (
                           <div className="flex items-center justify-between">
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
      </PageShell>
   );
}
