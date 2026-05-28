"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

import {
   checkoutServiceBooking,
   startPrivateLessonCheckout,
} from "../actions";
import {
   AvailabilityCalendar,
   type AvailabilityRange,
} from "./availability-calendar";
import { SubscriptionNeededDialog } from "./subscription-needed-dialog";

type CheckoutFlowProps = {
   service: ServiceView;
   hasActiveSubscription: boolean;
};

function formatPrice(cents: number | null, currency: string | null) {
   if (cents === null) return "—";
   const amount = (cents / 100).toFixed(2);
   const symbol = currency?.toUpperCase() ?? "CAD";
   return `$${amount} ${symbol}`;
}

export function CheckoutFlow({
   service,
   hasActiveSubscription,
}: CheckoutFlowProps) {
   const [step, setStep] = React.useState<"confirm" | "availability">(
      "confirm",
   );
   const [submitting, setSubmitting] = React.useState(false);
   const [subDialogOpen, setSubDialogOpen] = React.useState(false);
   const [availabilities, setAvailabilities] = React.useState<
      AvailabilityRange[]
   >([]);

   async function handleProgramCheckout() {
      setSubmitting(true);
      const result = await checkoutServiceBooking({ serviceId: service.id });
      if ("error" in result) {
         setSubmitting(false);
         toast.error(result.error);
         return;
      }
      window.location.href = result.url;
   }

   async function handlePrivateLessonCheckout() {
      if (availabilities.length === 0) {
         toast.error("Pick at least one availability window.");
         return;
      }
      setSubmitting(true);
      const result = await startPrivateLessonCheckout({
         serviceId: service.id,
         availabilities,
      });
      if ("error" in result) {
         setSubmitting(false);
         toast.error(result.error);
         return;
      }
      window.location.href = result.url;
   }

   function handleNextOnConfirm() {
      if (!hasActiveSubscription) {
         setSubDialogOpen(true);
         return;
      }
      if (service.type === "private_lessons") {
         setStep("availability");
         return;
      }
      void handleProgramCheckout();
   }

   if (step === "availability") {
      return (
         <Card>
            <CardHeader>
               <CardTitle>Pick your availabilities</CardTitle>
               <CardDescription>
                  Select the time windows that work for you over the next two
                  weeks. Your coach will confirm a slot from your choices.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <AvailabilityCalendar
                  value={availabilities}
                  onChange={setAvailabilities}
               />
            </CardContent>
            <CardFooter className="justify-between">
               <Button
                  variant="outline"
                  onClick={() => setStep("confirm")}
                  disabled={submitting}
               >
                  Back
               </Button>
               <Button
                  onClick={handlePrivateLessonCheckout}
                  disabled={submitting || availabilities.length === 0}
               >
                  {submitting ? "Redirecting…" : "Continue to payment"}
               </Button>
            </CardFooter>
         </Card>
      );
   }

   return (
      <>
         <Card>
            <CardHeader>
               <CardTitle>{service.title ?? "Checkout"}</CardTitle>
               <CardDescription>
                  {service.type === "private_lessons"
                     ? "Private lesson"
                     : "Program"}
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {service.description && (
                  <p className="text-sm text-muted-foreground">
                     {service.description}
                  </p>
               )}
               <div className="flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-base font-medium">
                     {formatPrice(service.priceCents, service.priceCurrency)}
                  </span>
               </div>
            </CardContent>
            <CardFooter className="justify-end">
               <Button onClick={handleNextOnConfirm} disabled={submitting}>
                  {submitting ? "Redirecting…" : "Next"}
               </Button>
            </CardFooter>
         </Card>
         <SubscriptionNeededDialog
            open={subDialogOpen}
            onOpenChange={setSubDialogOpen}
         />
      </>
   );
}
