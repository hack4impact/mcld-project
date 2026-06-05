"use client";

import { useActionState, useEffect } from "react";
import {
   saveService,
   type ServiceActionState,
} from "@/app/dashboard/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ServiceType } from "@/lib/services/service-types";
import { cn } from "@/lib/utils";

type Coach = { id: string; firstName: string; lastName: string };

type ServiceFormDialogProps = {
   open: boolean;
   onClose: () => void;
   type: ServiceType;
   coaches: Coach[];
   service?: {
      id: string;
      name: string;
      description: string;
      priceDollars: number;
      durationMinutes: number;
      startDate: string | null;
      endDate: string | null;
      coachId: string | null;
   };
};

const initialState: ServiceActionState = null;

export function ServiceFormDialog({
   open,
   onClose,
   type,
   coaches,
   service,
}: ServiceFormDialogProps) {
   const isEdit = Boolean(service);
   const [state, formAction, pending] = useActionState(saveService, initialState);

   useEffect(() => {
      if (state?.success) {
         onClose();
      }
   }, [state?.success, onClose]);

   if (!open) {
      return null;
   }

   const title =
      type === "programs"
         ? isEdit
            ? "Edit program"
            : "Add program"
         : isEdit
           ? "Edit private lesson"
           : "Add private lesson";

   return (
      <div
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
         onClick={onClose}
         onKeyDown={(event) => {
            if (event.key === "Escape") {
               onClose();
            }
         }}
      >
         <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-card p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
            onClick={(event) => event.stopPropagation()}
         >
            <div className="mb-6 flex items-center justify-between">
               <h2
                  id="service-form-title"
                  className="text-lg font-bold text-foreground"
               >
                  {title}
               </h2>
               <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
               >
                  ✕
               </button>
            </div>

            <form action={formAction} className="space-y-4">
               {isEdit && service && (
                  <input type="hidden" name="serviceId" value={service.id} />
               )}
               <input type="hidden" name="type" value={type} />

               <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                     id="name"
                     name="name"
                     required
                     defaultValue={service?.name}
                     placeholder="Youth LD/ ADHD Club"
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                     id="description"
                     name="description"
                     rows={3}
                     defaultValue={service?.description}
                     className={cn(
                        "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                     )}
                     placeholder="Shown on Stripe checkout"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="priceDollars">Price (CAD)</Label>
                     <Input
                        id="priceDollars"
                        name="priceDollars"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={
                           service
                              ? service.priceDollars.toFixed(2)
                              : undefined
                        }
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                     <Input
                        id="durationMinutes"
                        name="durationMinutes"
                        type="number"
                        min="1"
                        required
                        defaultValue={service?.durationMinutes ?? 60}
                     />
                  </div>
               </div>

               <fieldset className="space-y-3 rounded-lg border border-border p-4">
                  <legend className="px-1 text-sm font-semibold text-foreground">
                     Scheduling
                  </legend>
                  {type === "programs" ? (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor="startDate">Start date</Label>
                           <Input
                              id="startDate"
                              name="startDate"
                              type="date"
                              required
                              defaultValue={service?.startDate ?? undefined}
                           />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="endDate">End date</Label>
                           <Input
                              id="endDate"
                              name="endDate"
                              type="date"
                              required
                              defaultValue={service?.endDate ?? undefined}
                           />
                        </div>
                     </div>
                  ) : (
                     <>
                        <p className="text-sm text-muted-foreground">
                           Client-led scheduling — the client proposes times;
                           sessions are tracked in coaching sessions.
                        </p>
                        <div className="space-y-2">
                           <Label htmlFor="coachId">Coach (optional)</Label>
                           <select
                              id="coachId"
                              name="coachId"
                              defaultValue={service?.coachId ?? ""}
                              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                           >
                              <option value="">No coach assigned</option>
                              {coaches.map((coach) => (
                                 <option key={coach.id} value={coach.id}>
                                    {coach.firstName} {coach.lastName}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </>
                  )}
               </fieldset>

               {state?.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
               )}

               <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                     Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                     {pending
                        ? "Saving…"
                        : isEdit
                          ? "Save changes"
                          : "Create service"}
                  </Button>
               </div>
            </form>
         </div>
      </div>
   );
}
