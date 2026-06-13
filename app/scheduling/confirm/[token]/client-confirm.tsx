"use client";

import * as React from "react";

import { confirmFinalSlot } from "@/app/scheduling/token-actions";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { expandToBookableSlots } from "@/lib/scheduling/overlap";
import type { TimeSlot } from "@/lib/scheduling/time-slot";
import { cn } from "@/lib/utils";

function formatDay(slot: TimeSlot): string {
   return new Date(slot.start).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
   });
}

function formatTime(d: Date): string {
   return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatWindow(slot: TimeSlot): string {
   const start = new Date(slot.start);
   const end = new Date(slot.end);
   return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatConfirmed(slot: TimeSlot): string {
   const start = new Date(slot.start);
   const end = new Date(slot.end);
   const day = formatDay(slot);
   return `${day} · ${formatTime(start)} – ${formatTime(end)}`;
}

type State =
   | { kind: "idle" }
   | { kind: "submitting" }
   | { kind: "error"; message: string }
   | { kind: "done"; slot: TimeSlot };

export function ClientConfirm({
   token,
   serviceTitle,
   coachName,
   windows,
   durationMinutes,
}: {
   token: string;
   serviceTitle: string;
   coachName: string;
   windows: TimeSlot[];
   durationMinutes: number;
}) {
   const bookableByWindow = React.useMemo(
      () =>
         windows.map((window) =>
            expandToBookableSlots([window], durationMinutes),
         ),
      [windows, durationMinutes],
   );

   const [selectedWindow, setSelectedWindow] = React.useState(0);
   const [selectedStart, setSelectedStart] = React.useState<string | null>(
      null,
   );
   const [state, setState] = React.useState<State>({ kind: "idle" });

   const options = React.useMemo(
      () => bookableByWindow[selectedWindow] ?? [],
      [bookableByWindow, selectedWindow],
   );

   React.useEffect(() => {
      setSelectedStart(null);
   }, [selectedWindow]);

   const selectedSlot = React.useMemo(() => {
      if (!selectedStart) return null;
      return options.find((s) => s.start === selectedStart) ?? null;
   }, [options, selectedStart]);

   async function handleConfirm() {
      if (!selectedSlot) return;
      setState({ kind: "submitting" });
      const result = await confirmFinalSlot({ token, slot: selectedSlot });
      if (result.ok) {
         setState({ kind: "done", slot: selectedSlot });
      } else {
         setState({ kind: "error", message: result.error });
      }
   }

   if (state.kind === "done") {
      return (
         <div className="rounded-xl border border-border bg-card p-6 text-center">
            <h2 className="font-heading text-lg font-semibold text-emerald-600">
               Session confirmed
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
               Your {serviceTitle} session with {coachName} is booked for{" "}
               <strong>{formatConfirmed(state.slot)}</strong>. A confirmation
               email is on its way.
            </p>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-5">
         <p className="text-xs text-muted-foreground">
            Each session is {durationMinutes} minutes. Pick a day, then choose
            your exact start time.
         </p>

         <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Available days</legend>
            <div className="grid gap-2 sm:grid-cols-2">
               {windows.map((window, i) => {
                  const isSelected = selectedWindow === i;
                  const count = bookableByWindow[i]?.length ?? 0;
                  return (
                     <button
                        key={window.start}
                        type="button"
                        onClick={() => setSelectedWindow(i)}
                        aria-pressed={isSelected}
                        className={cn(
                           "rounded-lg border px-4 py-3 text-left transition-colors",
                           isSelected
                              ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                              : "border-border bg-card hover:bg-muted/50",
                        )}
                     >
                        <span className="block text-sm font-medium">
                           {formatDay(window)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                           {formatWindow(window)}
                        </span>
                        <span className="mt-1 block text-xs text-emerald-600">
                           {count} {count === 1 ? "time" : "times"} available
                        </span>
                     </button>
                  );
               })}
            </div>
         </fieldset>

         {options.length > 0 ? (
            <div className="flex flex-col gap-2">
               <label htmlFor="session-time" className="text-sm font-medium">
                  Start time
               </label>
               <Select
                  value={selectedStart ?? undefined}
                  onValueChange={setSelectedStart}
               >
                  <SelectTrigger
                     id="session-time"
                     className="h-11 w-full"
                     size="default"
                  >
                     <SelectValue placeholder="Choose a time…" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60">
                     {options.map((slot) => (
                        <SelectItem key={slot.start} value={slot.start}>
                           {formatWindow(slot)}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>
         ) : null}

         {selectedSlot ? (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
               <span className="text-muted-foreground">Your session: </span>
               <strong>{formatConfirmed(selectedSlot)}</strong>
            </div>
         ) : null}

         <Button
            onClick={handleConfirm}
            disabled={!selectedSlot || state.kind === "submitting"}
            size="lg"
         >
            {state.kind === "submitting" ? "Confirming…" : "Confirm this time"}
         </Button>

         {state.kind === "error" ? (
            <p className="text-sm text-destructive">{state.message}</p>
         ) : null}
      </div>
   );
}
