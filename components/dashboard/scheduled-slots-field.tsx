"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
   datetimeLocalToIso,
   isoToDatetimeLocal,
   parseScheduledSlotsFromDb,
   slotsToJson,
   type ScheduledSlot,
} from "@/lib/scheduled-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
   idPrefix: string;
   initialValue: unknown;
   /** When false (e.g. coaching session), submits an empty scheduled_at. */
   active: boolean;
};

export function ScheduledSlotsField({
   idPrefix,
   initialValue,
   active,
}: Props) {
   const [slots, setSlots] = useState<ScheduledSlot[]>(() => {
      const parsed = parseScheduledSlotsFromDb(initialValue);
      return parsed.length > 0 ? parsed : [];
   });

   const hiddenValue = useMemo(() => {
      if (!active) return "";
      return slotsToJson(slots);
   }, [active, slots]);

   if (!active) {
      return <input type="hidden" name="scheduled_at" value="" />;
   }

   function addSlot() {
      setSlots((s) => [...s, { start: "", end: "" }]);
   }

   function removeSlot(index: number) {
      setSlots((s) => s.filter((_, i) => i !== index));
   }

   function updateSlot(index: number, patch: Partial<ScheduledSlot>) {
      setSlots((s) =>
         s.map((row, i) => (i === index ? { ...row, ...patch } : row))
      );
   }

   return (
      <div className="space-y-3 sm:col-span-2">
         <input type="hidden" name="scheduled_at" value={hiddenValue} />
         <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Time slots</span>
            <Button
               type="button"
               variant="outline"
               size="sm"
               className="gap-1"
               onClick={addSlot}
            >
               <Plus className="size-4" aria-hidden />
               Add slot
            </Button>
         </div>
         <p className="text-muted-foreground text-xs">
            For bookings: one or more windows when this event runs (times use
            your browser&apos;s local timezone).
         </p>
         {slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">
               No slots yet. Click &quot;Add slot&quot; to add a start and end
               time.
            </p>
         ) : (
            <ul className="space-y-3">
               {slots.map((slot, index) => (
                  <li
                     key={`${idPrefix}-slot-${index}`}
                     className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end"
                  >
                     <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                           <Label htmlFor={`${idPrefix}-start-${index}`}>
                              Starts
                           </Label>
                           <Input
                              id={`${idPrefix}-start-${index}`}
                              type="datetime-local"
                              value={isoToDatetimeLocal(slot.start)}
                              onChange={(e) =>
                                 updateSlot(index, {
                                    start: datetimeLocalToIso(
                                       e.target.value
                                    ),
                                 })
                              }
                           />
                        </div>
                        <div className="space-y-1.5">
                           <Label htmlFor={`${idPrefix}-end-${index}`}>
                              Ends
                           </Label>
                           <Input
                              id={`${idPrefix}-end-${index}`}
                              type="datetime-local"
                              value={isoToDatetimeLocal(slot.end)}
                              onChange={(e) =>
                                 updateSlot(index, {
                                    end: datetimeLocalToIso(e.target.value),
                                 })
                              }
                           />
                        </div>
                     </div>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground shrink-0"
                        onClick={() => removeSlot(index)}
                        aria-label={`Remove slot ${index + 1}`}
                     >
                        <Trash2 className="size-4" />
                     </Button>
                  </li>
               ))}
            </ul>
         )}
      </div>
   );
}
