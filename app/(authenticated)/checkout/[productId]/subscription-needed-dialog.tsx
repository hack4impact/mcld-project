"use client";

import * as React from "react";
import { toast } from "sonner";

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { startSubscriptionCheckout } from "../actions";

export type SubscriptionNeededDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
};

export function SubscriptionNeededDialog({
   open,
   onOpenChange,
}: SubscriptionNeededDialogProps) {
   const [submitting, setSubmitting] = React.useState(false);

   async function handleConfirm(e: React.MouseEvent) {
      e.preventDefault();
      setSubmitting(true);
      const result = await startSubscriptionCheckout();
      if ("error" in result) {
         setSubmitting(false);
         toast.error(result.error);
         return;
      }
      window.location.href = result.url;
   }

   return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>Subscription needed</AlertDialogTitle>
               <AlertDialogDescription>
                  You need an active subscription before purchasing this
                  product. Would you like to subscribe now?
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel disabled={submitting}>No</AlertDialogCancel>
               <AlertDialogAction
                  onClick={handleConfirm}
                  disabled={submitting}
               >
                  {submitting ? "Redirecting…" : "Yes, subscribe"}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}
