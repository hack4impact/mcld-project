"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
   createService,
   type ServiceActionState,
} from "@/app/dashboard/services/actions";
import { ScheduledSlotsField } from "@/components/dashboard/scheduled-slots-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const controlClass =
   "flex min-h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

type AddServiceFormProps = {
   onCreated?: () => void;
};

export function AddServiceForm({ onCreated }: AddServiceFormProps) {
   const [serviceType, setServiceType] = useState<
      "coaching_session" | "booking"
   >("coaching_session");
   const [state, formAction, pending] = useActionState(
      createService,
      null as ServiceActionState
   );
   const handledSuccess = useRef(false);

   useEffect(() => {
      if (!state?.message) {
         handledSuccess.current = false;
         return;
      }
      if (handledSuccess.current) return;
      handledSuccess.current = true;
      onCreated?.();
   }, [state?.message, onCreated]);

   return (
      <form action={formAction} className="space-y-4">
         {state?.errors?._form?.[0] ? (
            <p className="text-destructive text-sm" role="alert">
               {state.errors._form[0]}
            </p>
         ) : null}
         {state?.message ? (
            <p className="text-sm text-green-700 dark:text-green-400">
               {state.message}
            </p>
         ) : null}

         <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
               <Label htmlFor="new-title">Title</Label>
               <Input
                  id="new-title"
                  name="title"
                  required
                  aria-invalid={!!state?.errors?.title}
               />
               {state?.errors?.title?.[0] ? (
                  <p className="text-destructive text-xs">
                     {state.errors.title[0]}
                  </p>
               ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
               <Label htmlFor="new-description">Description</Label>
               <textarea
                  id="new-description"
                  name="description"
                  rows={3}
                  className={cn(controlClass, "min-h-[72px] resize-y")}
               />
            </div>

            <div className="space-y-2">
               <Label htmlFor="new-type">Type</Label>
               <select
                  id="new-type"
                  name="type"
                  required
                  value={serviceType}
                  onChange={(e) =>
                     setServiceType(
                        e.target.value as "coaching_session" | "booking"
                     )
                  }
                  className={controlClass}
               >
                  <option value="coaching_session">Coaching session</option>
                  <option value="booking">Booking</option>
               </select>
            </div>

            <div className="space-y-2">
               <Label htmlFor="new-duration">Duration (minutes)</Label>
               <Input
                  id="new-duration"
                  name="duration_minutes"
                  type="number"
                  min={1}
                  defaultValue={60}
                  required
               />
               {state?.errors?.duration_minutes?.[0] ? (
                  <p className="text-destructive text-xs">
                     {state.errors.duration_minutes[0]}
                  </p>
               ) : null}
            </div>

            <div className="space-y-2">
               <Label htmlFor="new-price">Price (CAD)</Label>
               <Input
                  id="new-price"
                  name="price_cad"
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                  aria-invalid={!!state?.errors?.price_cad}
               />
               {state?.errors?.price_cad?.[0] ? (
                  <p className="text-destructive text-xs">
                     {state.errors.price_cad[0]}
                  </p>
               ) : null}
            </div>

            <ScheduledSlotsField
               idPrefix="new"
               initialValue={null}
               active={serviceType === "booking"}
            />
            {state?.errors?.scheduled_at?.[0] ? (
               <p className="text-destructive col-span-full text-xs">
                  {state.errors.scheduled_at[0]}
               </p>
            ) : null}
         </div>

         <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create service"}
         </Button>
      </form>
   );
}
