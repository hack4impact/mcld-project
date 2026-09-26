"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, Globe, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { saveCoordinatorWeeklyHours } from "@/app/private-lessons/actions";
import {
   formatTimeZone,
   hasWindowErrors,
   nextWeekdayOnOrAfter,
   timeZoneOptions,
   validateDayWindows,
   WEEKDAY_NAMES,
   WEEKDAY_ORDER,
   type Weekday,
} from "@/lib/availability-editor";
import { toMinutes } from "@/lib/availability";
import type {
   AvailabilityWindow,
   CoordinatorWeeklyHours,
} from "@/lib/db/schema";
import { TimeWindowRow } from "./time-window-row";

function nextWindow(existing: AvailabilityWindow[]): AvailabilityWindow {
   const last = existing.at(-1);
   if (!last) return { start: "09:00", end: "12:00", recurrence: "weekly" };
   const start = toMinutes(last.end) + 60;
   if (start + 60 >= 24 * 60) {
      return { start: "", end: "", recurrence: "weekly" };
   }
   const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
   return { start: fmt(start), end: fmt(start + 60), recurrence: "weekly" };
}

export function WeeklyHoursCard({
   coordinatorId,
   initialHours,
   initialTimezone,
   today,
   lessonMinutes,
   onSaved,
}: {
   coordinatorId: string;
   initialHours: CoordinatorWeeklyHours;
   initialTimezone: string;
   today: string;
   lessonMinutes: number;
   onSaved: (saved: {
      hours: CoordinatorWeeklyHours;
      timezone: string;
   }) => void;
}) {
   const [hours, setHours] = useState(initialHours);
   const [timezone, setTimezone] = useState(initialTimezone);
   const [saved, setSaved] = useState({
      hours: initialHours,
      timezone: initialTimezone,
   });
   const [serverError, setServerError] = useState<string | null>(null);
   const [saving, startSaving] = useTransition();

   const errors = useMemo(
      () =>
         Object.fromEntries(
            WEEKDAY_ORDER.map((day) => [day, validateDayWindows(hours[day])]),
         ) as Record<Weekday, (string | null)[]>,
      [hours],
   );
   const invalid = WEEKDAY_ORDER.some((day) => hasWindowErrors(errors[day]));
   const dirty =
      timezone !== saved.timezone ||
      JSON.stringify(hours) !== JSON.stringify(saved.hours);

   function updateDay(
      day: Weekday,
      update: (windows: AvailabilityWindow[]) => AvailabilityWindow[],
   ) {
      setServerError(null);
      setHours((prev) => ({ ...prev, [day]: update(prev[day]) }));
   }

   function updateWindow(
      day: Weekday,
      index: number,
      patch: Partial<AvailabilityWindow>,
   ) {
      updateDay(day, (windows) =>
         windows.map((window, i) => {
            if (i !== index) return window;
            const next = { ...window, ...patch };
            if (next.recurrence === "weekly") delete next.anchorDate;
            return next;
         }),
      );
   }

   function handleSave() {
      startSaving(async () => {
         const result = await saveCoordinatorWeeklyHours({
            coordinatorId,
            timezone,
            hours,
         });
         if ("error" in result) {
            setServerError(result.error);
            toast.error("Weekly hours not saved", {
               description: result.error,
            });
            return;
         }
         setSaved({ hours, timezone });
         toast.success("Weekly hours saved");
         onSaved({ hours, timezone });
      });
   }

   function handleDiscard() {
      setHours(saved.hours);
      setTimezone(saved.timezone);
      setServerError(null);
   }

   return (
      <Card>
         <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
               <CardTitle className="text-base font-semibold">
                  Weekly hours
               </CardTitle>
               <CardDescription>
                  Your regular schedule for private lessons. It applies to every
                  private lesson you coordinate.
               </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:items-end">
               <span className="text-xs font-medium text-muted-foreground">
                  Time zone
               </span>
               <Select
                  value={timezone}
                  onValueChange={(value) => {
                     setServerError(null);
                     setTimezone(value);
                  }}
               >
                  <SelectTrigger aria-label="Time zone" className="min-w-44">
                     <Globe className="text-muted-foreground" />
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                     {timeZoneOptions(timezone).map((zone) => (
                        <SelectItem key={zone} value={zone}>
                           {formatTimeZone(zone, today)}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
         </CardHeader>

         <CardContent className="flex flex-col divide-y divide-border/70 px-5">
            {WEEKDAY_ORDER.map((day) => {
               const windows = hours[day];
               return (
                  <section
                     key={day}
                     aria-label={WEEKDAY_NAMES[day]}
                     className="grid gap-2 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4"
                  >
                     <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0.5 sm:pt-1.5">
                        <span className="text-sm font-semibold text-foreground">
                           {WEEKDAY_NAMES[day]}
                        </span>
                        {windows.length === 0 && (
                           <span className="text-xs text-muted-foreground">
                              Unavailable
                           </span>
                        )}
                     </div>
                     <div className="flex flex-col gap-2.5">
                        {windows.map((window, index) => {
                           const label = `${WEEKDAY_NAMES[day]} window ${index + 1}`;
                           return (
                              <TimeWindowRow
                                 key={index}
                                 label={label}
                                 start={window.start}
                                 end={window.end}
                                 error={errors[day][index] ?? null}
                                 lessonMinutes={lessonMinutes}
                                 onChange={(times) =>
                                    updateWindow(day, index, times)
                                 }
                                 onRemove={() =>
                                    updateDay(day, (list) =>
                                       list.filter((_, i) => i !== index),
                                    )
                                 }
                              >
                                 <Select
                                    value={window.recurrence}
                                    onValueChange={(value) =>
                                       updateWindow(day, index, {
                                          recurrence: value as
                                             | "weekly"
                                             | "biweekly",
                                          anchorDate:
                                             value === "biweekly"
                                                ? (window.anchorDate ??
                                                  nextWeekdayOnOrAfter(
                                                     today,
                                                     day,
                                                  ))
                                                : undefined,
                                       })
                                    }
                                 >
                                    <SelectTrigger
                                       aria-label={`${label} repeats`}
                                       className="w-[10.5rem]"
                                    >
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="weekly">
                                          Every week
                                       </SelectItem>
                                       <SelectItem value="biweekly">
                                          Every other week
                                       </SelectItem>
                                    </SelectContent>
                                 </Select>
                                 {window.recurrence === "biweekly" && (
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                       starting
                                       <Input
                                          type="date"
                                          value={window.anchorDate ?? ""}
                                          aria-label={`${label} first week`}
                                          className="w-[9.5rem]"
                                          onChange={(e) =>
                                             updateWindow(day, index, {
                                                anchorDate:
                                                   e.target.value || undefined,
                                             })
                                          }
                                       />
                                    </label>
                                 )}
                              </TimeWindowRow>
                           );
                        })}
                        <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="w-fit text-primary"
                           onClick={() =>
                              updateDay(day, (list) => [
                                 ...list,
                                 nextWindow(list),
                              ])
                           }
                        >
                           <Plus />
                           Add hours
                        </Button>
                     </div>
                  </section>
               );
            })}
         </CardContent>

         <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
               {serverError ? (
                  <p
                     role="alert"
                     className="flex items-center gap-1.5 font-medium text-destructive"
                  >
                     <AlertCircle className="size-4 shrink-0" />
                     {serverError}
                  </p>
               ) : invalid ? (
                  <p className="flex items-center gap-1.5 font-medium text-destructive">
                     <AlertCircle className="size-4 shrink-0" />
                     Fix the highlighted hours before saving.
                  </p>
               ) : dirty ? (
                  <p className="text-muted-foreground">
                     You have unsaved changes.
                  </p>
               ) : (
                  <p className="text-muted-foreground">
                     Changes only affect future bookings. Lessons already booked
                     stay as they are.
                  </p>
               )}
            </div>
            <div className="flex shrink-0 gap-2">
               {dirty && (
                  <Button
                     type="button"
                     variant="outline"
                     disabled={saving}
                     onClick={handleDiscard}
                  >
                     Discard
                  </Button>
               )}
               <Button
                  type="button"
                  disabled={!dirty || invalid || saving}
                  onClick={handleSave}
               >
                  {saving ? "Saving…" : "Save weekly hours"}
               </Button>
            </div>
         </CardFooter>
      </Card>
   );
}
