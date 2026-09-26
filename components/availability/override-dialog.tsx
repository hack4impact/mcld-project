"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CalendarOff, Clock, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
   setCoordinatorAvailabilityOverride,
   type CoordinatorAvailabilityOverride,
} from "@/app/private-lessons/actions";
import { availabilityForRange } from "@/lib/availability";
import {
   formatShortDate,
   formatTimeRange,
   fromYmd,
   hasWindowErrors,
   toYmd,
   validateDayWindows,
} from "@/lib/availability-editor";
import type {
   AvailabilityOverrideWindow,
   CoordinatorWeeklyHours,
} from "@/lib/db/schema";
import { TimeWindowRow } from "./time-window-row";

type Mode = "custom" | "day_off";

type Props = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   coordinatorId: string;
   initialDate: string | null;
   overrides: CoordinatorAvailabilityOverride[];
   weeklyHours: CoordinatorWeeklyHours;
   today: string;
   lessonMinutes: number;
   onSaved: () => void;
};

export function OverrideDialog({ open, onOpenChange, ...props }: Props) {
   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-3xl">
            {open && (
               <OverrideForm
                  key={props.initialDate ?? "new"}
                  onDone={() => onOpenChange(false)}
                  {...props}
               />
            )}
         </DialogContent>
      </Dialog>
   );
}

function weeklyWindowsOn(
   hours: CoordinatorWeeklyHours,
   date: string,
): AvailabilityOverrideWindow[] {
   return availabilityForRange({
      hours,
      overrides: {},
      from: date,
      to: date,
   }).map(({ start, end }) => ({ start, end }));
}

function OverrideForm({
   coordinatorId,
   initialDate,
   overrides,
   weeklyHours,
   today,
   lessonMinutes,
   onSaved,
   onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
   const overrideByDate = useMemo(
      () => new Map(overrides.map((o) => [o.date, o.windows])),
      [overrides],
   );

   function stateFor(date: string | null): {
      mode: Mode;
      windows: AvailabilityOverrideWindow[];
   } {
      if (!date) return { mode: "custom", windows: [] };
      const existing = overrideByDate.get(date);
      if (existing) {
         return existing.length === 0
            ? { mode: "day_off", windows: [] }
            : { mode: "custom", windows: existing };
      }
      const usual = weeklyWindowsOn(weeklyHours, date);
      return {
         mode: "custom",
         windows: usual.length ? usual : [{ start: "09:00", end: "12:00" }],
      };
   }

   const [date, setDate] = useState<string | null>(initialDate);
   const [mode, setMode] = useState<Mode>(() => stateFor(initialDate).mode);
   const [windows, setWindows] = useState(() => stateFor(initialDate).windows);
   const [serverError, setServerError] = useState<string | null>(null);
   const [saving, startSaving] = useTransition();

   const errors = validateDayWindows(windows);
   const usualHours = date ? weeklyWindowsOn(weeklyHours, date) : [];
   const isExisting = date !== null && overrideByDate.has(date);
   const canSave =
      date !== null &&
      !saving &&
      (mode === "day_off" || (windows.length > 0 && !hasWindowErrors(errors)));

   function pickDate(next: string) {
      const state = stateFor(next);
      setDate(next);
      setMode(state.mode);
      setWindows(state.windows);
      setServerError(null);
   }

   function handleSave() {
      if (!date) return;
      startSaving(async () => {
         const result = await setCoordinatorAvailabilityOverride({
            coordinatorId,
            date,
            windows: mode === "day_off" ? [] : windows,
         });
         if ("error" in result) {
            setServerError(result.error);
            return;
         }
         toast.success(
            mode === "day_off"
               ? `${formatShortDate(date)} marked as a day off`
               : `Custom hours saved for ${formatShortDate(date)}`,
         );
         onSaved();
         onDone();
      });
   }

   return (
      <>
         <DialogHeader>
            <DialogTitle>
               {initialDate ? "Edit date override" : "Add date override"}
            </DialogTitle>
            <DialogDescription>
               An override replaces your weekly hours on that date only. Lessons
               already booked are not affected.
            </DialogDescription>
         </DialogHeader>

         <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
            <Calendar
               mode="single"
               required
               selected={date ? fromYmd(date) : undefined}
               defaultMonth={fromYmd(date ?? today)}
               onSelect={(day) => day && pickDate(toYmd(day))}
               disabled={{ before: fromYmd(today) }}
               modifiers={{
                  overridden: overrides.map((o) => fromYmd(o.date)),
               }}
               modifiersClassNames={{
                  overridden:
                     "[&>button]:underline [&>button]:decoration-brand-gold [&>button]:decoration-2 [&>button]:underline-offset-4",
               }}
               className="rounded-xl border border-border p-3 [--cell-size:--spacing(8)]"
            />

            <div className="flex min-w-0 flex-col gap-4">
               {date === null ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                     Pick a date on the calendar to override it.
                  </p>
               ) : (
                  <>
                     <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground">
                           {formatShortDate(date, true)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                           {usualHours.length
                              ? `Usual hours: ${usualHours
                                   .map((w) => formatTimeRange(w.start, w.end))
                                   .join(", ")}`
                              : "No weekly hours on this date."}
                           {isExisting && " · Already overridden"}
                        </p>
                     </div>

                     <ToggleGroup
                        type="single"
                        variant="outline"
                        spacing={0}
                        value={mode}
                        onValueChange={(value) => {
                           if (!value) return;
                           setServerError(null);
                           setMode(value as Mode);
                        }}
                        aria-label="Override type"
                     >
                        <ToggleGroupItem value="custom" className="px-3">
                           <Clock />
                           Custom hours
                        </ToggleGroupItem>
                        <ToggleGroupItem value="day_off" className="px-3">
                           <CalendarOff />
                           Day off
                        </ToggleGroupItem>
                     </ToggleGroup>

                     {mode === "day_off" ? (
                        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                           You won&apos;t have any availability on this date.
                        </p>
                     ) : (
                        <div className="flex flex-col gap-2.5">
                           {windows.map((window, index) => (
                              <TimeWindowRow
                                 key={index}
                                 label={`Override window ${index + 1}`}
                                 start={window.start}
                                 end={window.end}
                                 error={errors[index] ?? null}
                                 lessonMinutes={lessonMinutes}
                                 onChange={(next) => {
                                    setServerError(null);
                                    setWindows((prev) =>
                                       prev.map((w, i) =>
                                          i === index ? next : w,
                                       ),
                                    );
                                 }}
                                 onRemove={() =>
                                    setWindows((prev) =>
                                       prev.filter((_, i) => i !== index),
                                    )
                                 }
                              />
                           ))}
                           {windows.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                 Add at least one window, or choose Day off.
                              </p>
                           )}
                           <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-fit text-primary"
                              onClick={() =>
                                 setWindows((prev) => [
                                    ...prev,
                                    { start: "13:00", end: "15:00" },
                                 ])
                              }
                           >
                              <Plus />
                              Add hours
                           </Button>
                        </div>
                     )}
                  </>
               )}

               {serverError && (
                  <p
                     role="alert"
                     className="flex items-center gap-1.5 text-sm font-medium text-destructive"
                  >
                     <AlertCircle className="size-4 shrink-0" />
                     {serverError}
                  </p>
               )}
            </div>
         </div>

         <DialogFooter>
            <Button
               type="button"
               variant="outline"
               disabled={saving}
               onClick={onDone}
            >
               Cancel
            </Button>
            <Button type="button" disabled={!canSave} onClick={handleSave}>
               {saving ? "Saving…" : "Save override"}
            </Button>
         </DialogFooter>
      </>
   );
}
