"use client";

import * as React from "react";
import { addDays, addMinutes, format, startOfDay } from "date-fns";

import { cn } from "@/lib/utils";

const DAY_COUNT = 14;
const START_HOUR = 8;
const END_HOUR = 22;
const SLOT_MINUTES = 30;

export type AvailabilityRange = { start: string; end: string };

export type AvailabilityCalendarProps = {
   value: AvailabilityRange[];
   onChange: (next: AvailabilityRange[]) => void;
};

type CellKey = string; // ISO start datetime

function buildDays(): Date[] {
   const today = startOfDay(new Date());
   return Array.from({ length: DAY_COUNT }, (_, i) => addDays(today, i));
}

function buildSlotsForDay(day: Date): Date[] {
   const first = addMinutes(day, START_HOUR * 60);
   const count = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
   return Array.from({ length: count }, (_, i) =>
      addMinutes(first, i * SLOT_MINUTES),
   );
}

function rangesToCellSet(ranges: AvailabilityRange[]): Set<CellKey> {
   const set = new Set<CellKey>();
   for (const range of ranges) {
      let cursor = new Date(range.start);
      const end = new Date(range.end);
      while (cursor < end) {
         set.add(cursor.toISOString());
         cursor = addMinutes(cursor, SLOT_MINUTES);
      }
   }
   return set;
}

function cellSetToRanges(set: Set<CellKey>): AvailabilityRange[] {
   const sorted = Array.from(set)
      .map((iso) => new Date(iso))
      .sort((a, b) => a.getTime() - b.getTime());

   const ranges: AvailabilityRange[] = [];
   let rangeStart: Date | null = null;
   let prev: Date | null = null;

   for (const slot of sorted) {
      if (!rangeStart || !prev) {
         rangeStart = slot;
         prev = slot;
         continue;
      }
      const expected = addMinutes(prev, SLOT_MINUTES);
      if (slot.getTime() === expected.getTime()) {
         prev = slot;
         continue;
      }
      ranges.push({
         start: rangeStart.toISOString(),
         end: addMinutes(prev, SLOT_MINUTES).toISOString(),
      });
      rangeStart = slot;
      prev = slot;
   }

   if (rangeStart && prev) {
      ranges.push({
         start: rangeStart.toISOString(),
         end: addMinutes(prev, SLOT_MINUTES).toISOString(),
      });
   }

   return ranges;
}

/**
 * Mock when2meet-style availability picker. 14 days × 30-minute slots,
 * click-and-drag to select. Replace with the proper calendar from #12
 * when it lands — the props shape ({ value, onChange }) is the contract.
 */
export function AvailabilityCalendar({
   value,
   onChange,
}: AvailabilityCalendarProps) {
   const days = React.useMemo(() => buildDays(), []);
   const timeLabels = React.useMemo(() => buildSlotsForDay(days[0]), [days]);

   const selectedFromProps = React.useMemo(
      () => rangesToCellSet(value),
      [value],
   );

   const [working, setWorking] = React.useState<Set<CellKey> | null>(null);
   const dragModeRef = React.useRef<"select" | "deselect" | null>(null);
   const workingRef = React.useRef<Set<CellKey> | null>(null);
   React.useEffect(() => {
      workingRef.current = working;
   }, [working]);

   const displayed = working ?? selectedFromProps;

   const startDrag = (key: CellKey) => {
      const initiallyOn = selectedFromProps.has(key);
      dragModeRef.current = initiallyOn ? "deselect" : "select";
      const next = new Set(selectedFromProps);
      if (initiallyOn) next.delete(key);
      else next.add(key);
      setWorking(next);
   };

   const continueDrag = (key: CellKey) => {
      if (!dragModeRef.current) return;
      setWorking((prev) => {
         if (!prev) return prev;
         const next = new Set(prev);
         if (dragModeRef.current === "select") next.add(key);
         else next.delete(key);
         return next;
      });
   };

   React.useEffect(() => {
      function onMouseUp() {
         if (dragModeRef.current === null) return;
         dragModeRef.current = null;
         const finalSet = workingRef.current;
         setWorking(null);
         if (finalSet) onChange(cellSetToRanges(finalSet));
      }
      window.addEventListener("mouseup", onMouseUp);
      return () => window.removeEventListener("mouseup", onMouseUp);
   }, [onChange]);

   return (
      <div className="w-full select-none overflow-x-auto">
         <div
            className="grid gap-1"
            style={{
               gridTemplateColumns: `48px repeat(${DAY_COUNT}, minmax(48px, 1fr))`,
            }}
         >
            <div />
            {days.map((day) => (
               <div
                  key={day.toISOString()}
                  className="text-center text-xs font-medium"
               >
                  <div className="text-muted-foreground">
                     {format(day, "EEE")}
                  </div>
                  <div>{format(day, "MMM d")}</div>
               </div>
            ))}

            {timeLabels.map((slot) => {
               const slotKey = format(slot, "HH:mm");
               return (
                  <React.Fragment key={slotKey}>
                     <div className="pr-2 text-right text-[10px] leading-none text-muted-foreground">
                        {slotKey}
                     </div>
                     {days.map((day) => {
                        const cell = new Date(day);
                        cell.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
                        const key = cell.toISOString();
                        const on = displayed.has(key);
                        return (
                           <div
                              key={key}
                              role="button"
                              aria-pressed={on}
                              tabIndex={0}
                              onMouseDown={(e) => {
                                 e.preventDefault();
                                 startDrag(key);
                              }}
                              onMouseEnter={() => continueDrag(key)}
                              className={cn(
                                 "h-6 cursor-pointer rounded-sm border border-border/60 transition-colors",
                                 on
                                    ? "bg-primary"
                                    : "bg-muted/30 hover:bg-muted",
                              )}
                           />
                        );
                     })}
                  </React.Fragment>
               );
            })}
         </div>
      </div>
   );
}
