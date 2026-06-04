"use client";

import * as React from "react";

import { AvailabilityCalendar } from "@/components/scheduling/availability-calendar";
import { Button } from "@/components/ui/button";
import { intersectTimeSlots } from "@/lib/scheduling/overlap";
import type { TimeSlot, Weekday } from "@/lib/scheduling/time-slot";

import { submitCoachAvailabilities } from "@/app/scheduling/token-actions";

const ALL_DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

type CalendarWindow = {
   anchor: Date;
   weeks: number;
   startHour: number;
   endHour: number;
};

function deriveWindow(slots: TimeSlot[]): CalendarWindow {
   if (slots.length === 0) {
      const anchor = startOfWeek(new Date());
      return { anchor, weeks: 2, startHour: 8, endHour: 20 };
   }

   const starts = slots.map((s) => new Date(s.start));
   const ends = slots.map((s) => new Date(s.end));
   const min = new Date(Math.min(...starts.map((d) => d.getTime())));
   const max = new Date(Math.max(...ends.map((d) => d.getTime())));

   const anchor = startOfWeek(min);
   const dayMs = 86_400_000;
   const spanDays =
      Math.floor((startOfDay(max).getTime() - anchor.getTime()) / dayMs) + 1;
   const weeks = Math.max(1, Math.ceil(spanDays / 7));

   const startHour = Math.min(...starts.map((d) => d.getHours()));
   const endHour = Math.max(
      ...ends.map((d) => d.getHours() + (d.getMinutes() > 0 ? 1 : 0)),
   );

   return {
      anchor,
      weeks,
      startHour: Math.max(0, Math.min(startHour, 23)),
      endHour: Math.min(24, Math.max(endHour, startHour + 1)),
   };
}

function startOfDay(d: Date): Date {
   const x = new Date(d);
   x.setHours(0, 0, 0, 0);
   return x;
}

function startOfWeek(d: Date): Date {
   const x = startOfDay(d);
   x.setDate(x.getDate() - x.getDay());
   return x;
}

type SubmitState =
   | { kind: "idle" }
   | { kind: "submitting" }
   | { kind: "error"; message: string }
   | { kind: "done" };

export function CoachScheduler({
   token,
   clientName,
   clientSlots,
   initialCoachSlots,
}: {
   token: string;
   clientName: string;
   clientSlots: TimeSlot[];
   initialCoachSlots: TimeSlot[];
}) {
   const window = React.useMemo(() => deriveWindow(clientSlots), [clientSlots]);
   const [slots, setSlots] = React.useState<TimeSlot[]>(initialCoachSlots);
   const [state, setState] = React.useState<SubmitState>({ kind: "idle" });

   const overlap = React.useMemo(
      () => intersectTimeSlots(clientSlots, slots),
      [clientSlots, slots],
   );
   const matchCount = overlap.length;

   async function handleSubmit() {
      setState({ kind: "submitting" });
      const result = await submitCoachAvailabilities({ token, slots });
      if (result.ok) {
         setState({ kind: "done" });
      } else {
         setState({ kind: "error", message: result.error });
      }
   }

   if (state.kind === "done") {
      return (
         <div className="rounded-xl border border-border bg-card p-6 text-center">
            <h2 className="font-heading text-lg font-semibold text-emerald-600">
               Availability sent
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
               We've emailed {clientName} the {matchCount} matching{" "}
               {matchCount === 1 ? "window" : "windows"} so they can confirm a
               time. You can close this page.
            </p>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-4">
         <Legend />

         <div className="overflow-hidden rounded-xl border border-border bg-card">
            <AvailabilityCalendar
               weeks={window.weeks}
               daysOfWeek={ALL_DAYS}
               startHour={window.startHour}
               endHour={window.endHour}
               anchor={window.anchor}
               value={slots}
               onChange={setSlots}
               referenceValue={clientSlots}
            />
         </div>

         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
               {matchCount > 0 ? (
                  <>
                     <span className="font-semibold text-emerald-600">
                        {matchCount}
                     </span>{" "}
                     matching {matchCount === 1 ? "window" : "windows"} with{" "}
                     {clientName}
                  </>
               ) : (
                  "No overlap yet"
               )}
            </p>
            <Button
               onClick={handleSubmit}
               disabled={state.kind === "submitting" || matchCount === 0}
               size="lg"
            >
               {state.kind === "submitting"
                  ? "Sending…"
                  : "Send matching times to client"}
            </Button>
         </div>

         {state.kind === "error" ? (
            <p className="text-sm text-destructive">{state.message}</p>
         ) : null}
      </div>
   );
}

function Legend() {
   return (
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
         <LegendSwatch className="bg-emerald-100" label={`Client available`} />
         <LegendSwatch className="bg-ring" label="Your pick" />
         <LegendSwatch className="bg-emerald-500" label="Match" />
      </div>
   );
}

function LegendSwatch({
   className,
   label,
}: {
   className: string;
   label: string;
}) {
   return (
      <span className="inline-flex items-center gap-1.5">
         <span className={`inline-block h-3 w-3 rounded-sm ${className}`} />
         {label}
      </span>
   );
}
