"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardFooter,
   CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
   Stepper,
   StepperIndicator,
   StepperItem,
   StepperList,
   StepperSeparator,
   StepperTitle,
   StepperTrigger,
} from "@/components/ui/stepper";
import type { ServiceView } from "@/app/(authenticated)/services/queries";
import type { ProductDiscountForUser } from "@/lib/stripe";

import { checkoutServiceBooking, startPrivateLessonCheckout } from "../actions";
import {
   AvailabilityCalendar,
   type AvailabilityRange,
} from "./availability-calendar";

type CheckoutFlowProps = {
   service: ServiceView;
   discount: ProductDiscountForUser | null;
};

function formatPrice(cents: number | null, currency: string | null) {
   if (cents === null) return "—";
   const symbol = currency?.toUpperCase() ?? "CAD";
   return `$${(cents / 100).toFixed(2)} ${symbol}`;
}

function serviceTypeLabel(type: ServiceView["type"]) {
   return type === "private_lessons" ? "Private lesson" : "Program";
}

function applyDiscount(
   cents: number,
   discount: ProductDiscountForUser,
): number {
   if (discount.percentOff !== null) {
      return Math.round(cents * (1 - discount.percentOff / 100));
   }
   if (discount.amountOffCents !== null) {
      return Math.max(0, cents - discount.amountOffCents);
   }
   return cents;
}

type Pricing = {
   totalLabel: string;
   discount: {
      subtotalLabel: string;
      savingsLabel: string;
   } | null;
};

function buildPricing(
   service: ServiceView,
   discount: ProductDiscountForUser | null,
): Pricing {
   const { priceCents, priceCurrency } = service;
   const totalLabel = formatPrice(priceCents, priceCurrency);

   if (priceCents === null || discount === null) {
      return { totalLabel, discount: null };
   }

   const finalCents = applyDiscount(priceCents, discount);
   if (finalCents >= priceCents) {
      return { totalLabel, discount: null };
   }

   return {
      totalLabel: formatPrice(finalCents, priceCurrency),
      discount: {
         subtotalLabel: formatPrice(priceCents, priceCurrency),
         savingsLabel: formatPrice(priceCents - finalCents, priceCurrency),
      },
   };
}

const STRIPE_BRAND = "#635BFF";

function PoweredByStripe() {
   return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
         <span>Powered by</span>
         <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium transition-opacity hover:opacity-80"
            style={{ color: STRIPE_BRAND }}
         >
            <svg
               role="img"
               viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg"
               className="h-3.5 w-3.5"
               fill="currentColor"
               aria-hidden="true"
            >
               <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
            </svg>
            Stripe
         </a>
      </div>
   );
}

export function CheckoutFlow({ service, discount }: CheckoutFlowProps) {
   const [step, setStep] = React.useState<"confirm" | "availability">(
      "confirm",
   );
   const [submitting, setSubmitting] = React.useState(false);
   const [availabilities, setAvailabilities] = React.useState<
      AvailabilityRange[]
   >([]);

   const isPrivateLesson = service.type === "private_lessons";
   const pricing = buildPricing(service, discount);
   const showAvailabilityStep = isPrivateLesson;

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
      if (isPrivateLesson) {
         setStep("availability");
         return;
      }
      void handleProgramCheckout();
   }

   return (
      <div className="flex flex-col gap-6">
         {showAvailabilityStep && (
            <Stepper
               value={step}
               nonInteractive
               className="mx-auto w-full max-w-xs"
            >
               <StepperList className="w-full">
                  <StepperItem value="confirm" className="flex-1">
                     <StepperTrigger className="gap-2">
                        <StepperIndicator>1</StepperIndicator>
                        <StepperTitle>Review</StepperTitle>
                     </StepperTrigger>
                     <StepperSeparator />
                  </StepperItem>
                  <StepperItem value="availability">
                     <StepperTrigger className="gap-2">
                        <StepperIndicator>2</StepperIndicator>
                        <StepperTitle>Availability</StepperTitle>
                     </StepperTrigger>
                  </StepperItem>
               </StepperList>
            </Stepper>
         )}

         {step === "confirm" ? (
            <Card className="overflow-hidden">
               <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                     <h1 className="font-heading text-2xl font-semibold leading-tight">
                        {service.title ?? "Untitled service"}
                     </h1>
                     <Badge variant="secondary" className="shrink-0">
                        {serviceTypeLabel(service.type)}
                     </Badge>
                  </div>
                  {service.description && (
                     <p className="text-sm leading-relaxed text-muted-foreground">
                        {service.description}
                     </p>
                  )}
               </CardHeader>
               <CardContent className="space-y-4">
                  <Separator />
                  <dl className="space-y-3 text-sm">
                     <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Duration</dt>
                        <dd className="font-medium">
                           {service.durationMinutes} min
                        </dd>
                     </div>
                     {pricing.discount && (
                        <>
                           <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">
                                 Subtotal
                              </dt>
                              <dd className="font-medium">
                                 {pricing.discount.subtotalLabel}
                              </dd>
                           </div>
                           <div className="flex items-center justify-between text-emerald-600">
                              <dt>Discount</dt>
                              <dd className="font-medium">
                                 −{pricing.discount.savingsLabel}
                              </dd>
                           </div>
                        </>
                     )}
                     <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Total</dt>
                        <dd className="flex items-baseline gap-2">
                           {pricing.discount && (
                              <span className="text-sm font-normal text-muted-foreground line-through">
                                 {pricing.discount.subtotalLabel}
                              </span>
                           )}
                           <span className="font-heading text-lg font-semibold">
                              {pricing.totalLabel}
                           </span>
                        </dd>
                     </div>
                  </dl>
               </CardContent>
               <CardFooter className="flex-col gap-1 sm:flex-row sm:justify-between">
                  <Button asChild variant="ghost" size="sm">
                     <Link href="/">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back
                     </Link>
                  </Button>
                  <Button
                     onClick={handleNextOnConfirm}
                     disabled={submitting}
                     size="lg"
                     className="w-full sm:w-auto"
                  >
                     {submitting ? "Redirecting…" : "Continue to payment"}
                  </Button>
               </CardFooter>
            </Card>
         ) : (
            <Card>
               <CardHeader className="space-y-2">
                  <h2 className="font-heading text-xl font-semibold">
                     Pick your availabilities
                  </h2>
                  <p className="text-sm text-muted-foreground">
                     Click and drag any time blocks that work for you over the
                     next two weeks. Your coach will confirm a slot from your
                     choices.
                  </p>
               </CardHeader>
               <CardContent>
                  <AvailabilityCalendar
                     value={availabilities}
                     onChange={setAvailabilities}
                  />
               </CardContent>
               <CardFooter className="flex-col gap-3 border-t bg-muted/40 px-6 py-4 sm:flex-row sm:justify-between">
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setStep("confirm")}
                     disabled={submitting}
                  >
                     <ArrowLeft className="mr-1 h-4 w-4" />
                     Back
                  </Button>
                  <Button
                     onClick={handlePrivateLessonCheckout}
                     disabled={submitting || availabilities.length === 0}
                     size="lg"
                     className="w-full sm:w-auto"
                  >
                     {submitting ? "Redirecting…" : "Continue to payment"}
                  </Button>
               </CardFooter>
            </Card>
         )}

         <PoweredByStripe />
      </div>
   );
}
