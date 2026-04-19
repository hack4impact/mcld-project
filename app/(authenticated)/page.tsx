import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { signout } from "@/app/login/actions";
import { getSubscriptionDetails } from "@/lib/stripe";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/subscribe-button";

const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
const PRODUCT_PRICE_ID = process.env.STRIPE_PRODUCT_PRICE_ID!;

export default function Page() {
   return (
      <Suspense>
         <HomeContent />
      </Suspense>
   );
}

async function HomeContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   const [subscription] = await Promise.all([getSubscriptionDetails(user.id)]);
   const ownsProduct = false;

   return (
      <main className="min-h-screen p-4 w-full">
         <div className="flex flex-row gap-4 w-full">
            <Card className="flex-1">
               <CardHeader>
                  <CardTitle className="text-2xl">Welcome t</CardTitle>
                  <CardDescription>You are signed in as</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <p className="text-sm font-medium">{user.email}</p>
                  <form>
                     <Button formAction={signout} variant="outline">
                        Sign out
                     </Button>
                  </form>
               </CardContent>
            </Card>

            <Card className="flex-1">
               <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                     {subscription
                        ? "Your current plan"
                        : "Subscribe to unlock premium features"}
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  {subscription ? (
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-gray-500">Plan</span>
                           <span className="text-sm font-medium">
                              {subscription.planName}
                           </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-gray-500">Price</span>
                           <span className="text-sm font-medium">
                              ${(subscription.priceAmount / 100).toFixed(2)}/
                              {subscription.priceInterval}
                           </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-gray-500">Status</span>
                           <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-sm font-medium text-green-700">
                                 Active
                              </span>
                           </div>
                        </div>
                        {subscription.paymentMethodBrand && (
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                 Payment
                              </span>
                              <span className="text-sm font-medium capitalize">
                                 {subscription.paymentMethodBrand} ****
                                 {subscription.paymentMethodLast4}
                              </span>
                           </div>
                        )}
                        {subscription.cancelAtPeriodEnd && (
                           <p className="text-sm text-amber-600">
                              Cancels at end of billing period
                           </p>
                        )}
                     </div>
                  ) : (
                     <CheckoutButton
                        priceId={SUBSCRIPTION_PRICE_ID}
                        mode="subscription"
                        label="Subscribe"
                     />
                  )}
               </CardContent>
            </Card>

            <Card className="flex-1">
               <CardHeader>
                  <CardTitle>Product</CardTitle>
                  <CardDescription>
                     {ownsProduct
                        ? "You own this product"
                        : "One-time purchase"}
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  {ownsProduct ? (
                     <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-700">
                           Purchased
                        </span>
                     </div>
                  ) : (
                     <CheckoutButton
                        priceId={PRODUCT_PRICE_ID}
                        mode="payment"
                        label="Buy Now"
                     />
                  )}
               </CardContent>
            </Card>
         </div>
      </main>
   );
}
