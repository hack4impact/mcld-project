import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckoutButton } from "@/components/subscribe-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDate, formatDateFromInstant } from "@/lib/format";
import { formatCents } from "@/lib/money";
import { getSubscriptionDetails } from "@/lib/stripe";
import { StatusBadge } from "./_components/status-badge";
import { listBookingsForUser } from "./bookings/queries";
import { listMyTransactions } from "./transactions/queries";

const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;

const RECENT_LIMIT = 3;

export default function AccountOverviewPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <OverviewContent />
      </Suspense>
   );
}

async function OverviewContent() {
   const user = await getCurrentUser();
   if (!user) redirect("/login");

   const [subscription, bookings, transactions] = await Promise.all([
      getSubscriptionDetails(user.id),
      listBookingsForUser(user.id),
      listMyTransactions(user.id),
   ]);

   const upcoming = bookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "completed",
   );
   const recentTransactions = transactions.data.slice(0, RECENT_LIMIT);

   return (
      <main className="flex flex-col gap-6 p-8">
         <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Overview</h1>
            <p className="text-sm text-muted-foreground">
               Signed in as {user.email}
            </p>
         </div>

         <div className="grid gap-4 lg:grid-cols-3">
            <Card>
               <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                     {subscription
                        ? "Your current plan"
                        : "Subscribe to unlock premium features"}
                  </CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                  {subscription ? (
                     <>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-muted-foreground">
                              Plan
                           </span>
                           <span className="text-sm font-medium">
                              {subscription.planName}
                           </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-muted-foreground">
                              Price
                           </span>
                           <span className="text-sm font-medium">
                              {formatCents(subscription.priceAmount, "cad")}/
                              {subscription.priceInterval}
                           </span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-sm text-muted-foreground">
                              Status
                           </span>
                           <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-sm font-medium text-green-700">
                                 Active
                              </span>
                           </div>
                        </div>
                        {subscription.cancelAtPeriodEnd && (
                           <p className="text-sm text-amber-600">
                              Cancels at end of billing period
                           </p>
                        )}
                     </>
                  ) : (
                     <CheckoutButton
                        priceId={SUBSCRIPTION_PRICE_ID}
                        mode="subscription"
                        label="Subscribe"
                     />
                  )}
               </CardContent>
            </Card>

            <Card>
               <CardHeader>
                  <CardTitle>Upcoming bookings</CardTitle>
                  <CardDescription>
                     <Link href="/account/bookings" className="underline">
                        View all bookings
                     </Link>
                  </CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                  {upcoming.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        Nothing booked right now.
                     </p>
                  ) : (
                     upcoming.slice(0, RECENT_LIMIT).map((booking) => (
                        <div
                           key={`${booking.kind}-${booking.id}`}
                           className="flex items-start justify-between gap-3"
                        >
                           <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                 {booking.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                 {booking.attendee ?? "You"}
                                 {booking.startDate &&
                                    ` · from ${formatDate(booking.startDate)}`}
                              </p>
                           </div>
                           <StatusBadge status={booking.status} />
                        </div>
                     ))
                  )}
               </CardContent>
            </Card>

            <Card>
               <CardHeader>
                  <CardTitle>Recent transactions</CardTitle>
                  <CardDescription>
                     <Link href="/account/transactions" className="underline">
                        View all transactions
                     </Link>
                  </CardDescription>
               </CardHeader>
               <CardContent className="space-y-3">
                  {recentTransactions.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        No payments yet.
                     </p>
                  ) : (
                     recentTransactions.map((transaction) => (
                        <div
                           key={transaction.id}
                           className="flex items-start justify-between gap-3"
                        >
                           <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                 {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                 {formatDateFromInstant(
                                    new Date(transaction.created * 1000),
                                 )}
                              </p>
                           </div>
                           <span className="text-sm font-medium">
                              {formatCents(
                                 transaction.amount,
                                 transaction.currency,
                              )}
                           </span>
                        </div>
                     ))
                  )}
               </CardContent>
            </Card>
         </div>
      </main>
   );
}
