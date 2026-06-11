"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
   buildCalendarRange,
   buildHourRange,
   formatHourLabel,
   formatSlotAriaLabel,
   formatTimeRange,
   keysToTimeSlots,
   slotKey,
   timeSlotsToKeys,
   SLOT_INDICES,
   SLOT_MINUTES,
   SLOTS_PER_HOUR,
   type TimeSlot,
   type Weekday,
} from "@/lib/scheduling/time-slot";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

type AvailabilityCalendarProps = {
   weeks: number;
   daysOfWeek: Weekday[];
   startHour: number;
   endHour: number;
   anchor: Date | null;
   value: TimeSlot[];
   onChange: (slots: TimeSlot[]) => void;
   referenceValue?: TimeSlot[];
   className?: string;
};

type DragState =
   | { kind: "idle" }
   | {
        kind: "dragging";
        mode: "add" | "remove";
        startKey: string;
        currentKey: string | null;
        visited: Set<string>;
        pointerId: number;
        startSelected: Set<string>;
     };

const IDLE: DragState = { kind: "idle" };

export function AvailabilityCalendar({
   weeks,
   daysOfWeek,
   startHour,
   endHour,
   anchor,
   value,
   onChange,
   referenceValue,
   className,
}: AvailabilityCalendarProps) {
   const reference = React.useMemo(
      () => new Set(timeSlotsToKeys(referenceValue ?? [])),
      [referenceValue],
   );
   const selected = React.useMemo(
      () => new Set(timeSlotsToKeys(value)),
      [value],
   );

   const { weeks: weekRanges, days } = React.useMemo(() => {
      if (!anchor) return { weeks: [], days: [] as Date[] };
      return buildCalendarRange({ weeks, daysOfWeek, anchor });
   }, [weeks, daysOfWeek, anchor]);

   const columnCount = days.length;
   const gridColumns = `3.5rem repeat(${columnCount}, minmax(0, 1fr))`;

   const [drag, setDrag] = React.useState<DragState>(IDLE);
   const [pointerPos, setPointerPos] = React.useState<{
      x: number;
      y: number;
   } | null>(null);

   const gridRef = React.useRef<HTMLDivElement>(null);
   const dragRef = React.useRef<DragState>(IDLE);

   const setDragState = React.useCallback((next: DragState) => {
      dragRef.current = next;
      setDrag(next);
   }, []);

   const { keyToCoord, coordToKey } = React.useMemo(() => {
      const keyToCoordMap = new Map<
         string,
         { dayIndex: number; slotIndex: number }
      >();
      const coordToKeyMap = new Map<string, string>();

      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
         const day = days[dayIndex]!;
         for (let hour = startHour; hour < endHour; hour++) {
            for (const quarter of SLOT_INDICES) {
               const slotIndex = (hour - startHour) * SLOTS_PER_HOUR + quarter;
               const d = new Date(day);
               d.setHours(hour, quarter * SLOT_MINUTES, 0, 0);
               const key = slotKey(d);
               keyToCoordMap.set(key, { dayIndex, slotIndex });
               coordToKeyMap.set(`${dayIndex}:${slotIndex}`, key);
            }
         }
      }

      return { keyToCoord: keyToCoordMap, coordToKey: coordToKeyMap };
   }, [days, startHour, endHour]);

   const getRangeKeys = React.useCallback(
      (fromKey: string, toKey: string) => {
         const from = keyToCoord.get(fromKey);
         const to = keyToCoord.get(toKey);
         if (!from || !to) return [toKey];

         const dayStart = Math.min(from.dayIndex, to.dayIndex);
         const dayEnd = Math.max(from.dayIndex, to.dayIndex);
         const slotStart = Math.min(from.slotIndex, to.slotIndex);
         const slotEnd = Math.max(from.slotIndex, to.slotIndex);
         const keys: string[] = [];

         for (let slotIndex = slotStart; slotIndex <= slotEnd; slotIndex++) {
            for (let dayIndex = dayStart; dayIndex <= dayEnd; dayIndex++) {
               const key = coordToKey.get(`${dayIndex}:${slotIndex}`);
               if (key) keys.push(key);
            }
         }
         return keys;
      },
      [keyToCoord, coordToKey],
   );

   const visitSlot = React.useCallback(
      (key: string) => {
         const current = dragRef.current;
         if (current.kind !== "dragging") return;
         if (current.currentKey === key) return;
         setDragState({
            ...current,
            currentKey: key,
            visited: new Set(getRangeKeys(current.startKey, key)),
         });
      },
      [getRangeKeys, setDragState],
   );

   const getSlotKeyFromPoint = React.useCallback((x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const slot = el?.closest<HTMLElement>("[data-slot-key]");
      return slot?.dataset.slotKey ?? null;
   }, []);

   const handleGridPointerMove = React.useCallback(
      (e: React.PointerEvent) => {
         if (dragRef.current.kind !== "dragging") return;
         setPointerPos({ x: e.clientX, y: e.clientY });
         const key = getSlotKeyFromPoint(e.clientX, e.clientY);
         if (key) visitSlot(key);
      },
      [getSlotKeyFromPoint, visitSlot],
   );

   const startDragAt = React.useCallback(
      (key: string, pointerId: number) => {
         const mode: "add" | "remove" = selected.has(key) ? "remove" : "add";
         setDragState({
            kind: "dragging",
            mode,
            startKey: key,
            currentKey: key,
            visited: new Set([key]),
            pointerId,
            startSelected: new Set(selected),
         });
         gridRef.current?.setPointerCapture(pointerId);
      },
      [selected, setDragState],
   );

   const handleSlotPointerDown = React.useCallback(
      (e: React.PointerEvent, key: string) => {
         e.preventDefault();
         startDragAt(key, e.pointerId);
      },
      [startDragAt],
   );

   const toggleKey = React.useCallback(
      (key: string) => {
         const next = new Set(selected);
         if (next.has(key)) next.delete(key);
         else next.add(key);
         onChange(keysToTimeSlots(next));
      },
      [selected, onChange],
   );

   const handleSlotKeyDown = React.useCallback(
      (e: React.KeyboardEvent, key: string) => {
         if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggleKey(key);
         }
      },
      [toggleKey],
   );

   React.useEffect(() => {
      const endDrag = () => {
         const current = dragRef.current;
         if (current.kind !== "dragging") {
            setPointerPos(null);
            return;
         }

         const visited = current.visited;
         if (visited.size > 0) {
            const next = new Set(selected);
            for (const k of visited) {
               if (current.mode === "add") next.add(k);
               else next.delete(k);
            }
            onChange(keysToTimeSlots(next));
         }

         if (gridRef.current) {
            try {
               gridRef.current.releasePointerCapture(current.pointerId);
            } catch {}
         }

         setDragState(IDLE);
         setPointerPos(null);
      };
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      return () => {
         window.removeEventListener("pointerup", endDrag);
         window.removeEventListener("pointercancel", endDrag);
      };
   }, [selected, onChange, setDragState]);

   const tooltip = React.useMemo(() => {
      if (drag.kind !== "dragging" || drag.visited.size === 0) return null;
      const dates = [...drag.visited]
         .map((k) => new Date(k))
         .sort((a, b) => a.getTime() - b.getTime());
      const start = dates[0]!;
      const end = new Date(
         dates[dates.length - 1]!.getTime() + SLOT_MINUTES * 60_000,
      );
      return formatTimeRange(start, end);
   }, [drag]);

   const hours = React.useMemo(
      () => buildHourRange(startHour, endHour),
      [startHour, endHour],
   );

   const tooltipStyle = React.useMemo<React.CSSProperties | null>(() => {
      if (!pointerPos) return null;
      const margin = 96;
      const vw = typeof window !== "undefined" ? window.innerWidth : 0;
      const x = Math.min(
         Math.max(pointerPos.x, margin),
         Math.max(margin, vw - margin),
      );
      const y = Math.max(pointerPos.y, 44);
      return {
         left: x,
         top: y,
         transform: "translate(-50%, calc(-100% - 8px))",
      };
   }, [pointerPos]);

   if (!anchor) {
      return (
         <Skeleton
            className={cn("min-h-[400px] w-full rounded-xl", className)}
            aria-busy="true"
            aria-label="Loading availability calendar"
         />
      );
   }

   return (
      <div className={cn("mx-auto w-full max-w-7xl bg-card", className)}>
         <div className="overflow-x-auto">
            <div
               style={{ minWidth: `${Math.max(560, 56 + columnCount * 48)}px` }}
            >
               <WeekHeaders weeks={weekRanges} gridColumns={gridColumns} />
               <DayHeaders days={days} gridColumns={gridColumns} />

               <div
                  ref={gridRef}
                  className="relative grid touch-none select-none"
                  style={{ gridTemplateColumns: gridColumns }}
                  onPointerMove={handleGridPointerMove}
               >
                  {hours.map((hour) =>
                     SLOT_INDICES.map((quarter) => {
                        const slotMinute = quarter * SLOT_MINUTES;
                        const showHourLabel = quarter === 0;

                        return (
                           <React.Fragment key={`${hour}-${quarter}`}>
                              <div
                                 className={cn(
                                    "sticky left-0 z-20 h-3 bg-card pr-2 text-right text-[11px] font-medium text-muted-foreground",
                                    "border-t border-border/40",
                                    quarter === 0 && "border-t-border",
                                    showHourLabel &&
                                       "flex items-start justify-end",
                                 )}
                                 style={{ gridRow: "span 1", gridColumn: 1 }}
                              >
                                 {showHourLabel ? formatHourLabel(hour) : null}
                              </div>

                              {days.map((day, dayIndex) => {
                                 const slotDate = new Date(day);
                                 slotDate.setHours(hour, slotMinute, 0, 0);
                                 const key = slotKey(slotDate);
                                 const isSelected = selected.has(key);
                                 const isDragging = drag.kind === "dragging";
                                 const isDragPreview =
                                    isDragging && drag.visited.has(key);
                                 const wasSelectedAtDragStart =
                                    isDragging && drag.startSelected.has(key);
                                 const isAddPreview =
                                    isDragPreview &&
                                    drag.mode === "add" &&
                                    !isSelected;
                                 const isRemovePreview =
                                    isDragPreview &&
                                    drag.mode === "remove" &&
                                    wasSelectedAtDragStart;
                                 const inReference = reference.has(key);
                                 const isOverlap = isSelected && inReference;

                                 return (
                                    <button
                                       key={key}
                                       type="button"
                                       data-slot-key={key}
                                       className={cn(
                                          "h-3 w-full border-t border-l border-border/40 transition-colors select-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
                                          quarter === 0 && "border-t-border",
                                          inReference &&
                                             !isSelected &&
                                             "bg-emerald-100",
                                          isSelected &&
                                             !inReference &&
                                             "bg-ring hover:bg-ring/90",
                                          isOverlap &&
                                             "bg-emerald-500 hover:bg-emerald-500/90",
                                          (isAddPreview || isRemovePreview) &&
                                             "border border-dashed border-ring bg-ring/25",
                                       )}
                                       style={{ gridColumn: dayIndex + 2 }}
                                       onPointerDown={(e) =>
                                          handleSlotPointerDown(e, key)
                                       }
                                       onKeyDown={(e) =>
                                          handleSlotKeyDown(e, key)
                                       }
                                       aria-pressed={isSelected}
                                       aria-label={formatSlotAriaLabel(
                                          slotDate,
                                       )}
                                    />
                                 );
                              })}
                           </React.Fragment>
                        );
                     }),
                  )}

                  {tooltip && tooltipStyle ? (
                     <div
                        className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
                        style={tooltipStyle}
                     >
                        {tooltip}
                     </div>
                  ) : null}
               </div>
            </div>
         </div>
      </div>
   );
}

function formatWeekRange(days: Date[]): string {
   if (days.length === 0) return "";
   const a = days[0]!;
   const b = days[days.length - 1]!;
   return `${a.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}–${b.getDate()}`;
}

function WeekHeaders({
   weeks,
   gridColumns,
}: {
   weeks: Date[][];
   gridColumns: string;
}) {
   return (
      <div
         className="grid border-b border-border text-xs font-bold tracking-wide text-accent-foreground"
         style={{ gridTemplateColumns: gridColumns }}
      >
         <div className="sticky left-0 z-30 bg-card" />
         {weeks.map((weekDays, index) => (
            <div
               key={index}
               className={cn(
                  "py-1.5 pl-3 text-left",
                  index % 2 === 0 ? "bg-accent/40" : "bg-accent/60",
                  index < weeks.length - 1 && "border-r-2 border-ring",
               )}
               style={{ gridColumn: `span ${weekDays.length}` }}
            >
               WEEK {index + 1} · {formatWeekRange(weekDays)}
            </div>
         ))}
      </div>
   );
}

function DayHeaders({
   days,
   gridColumns,
}: {
   days: Date[];
   gridColumns: string;
}) {
   return (
      <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
         <div className="sticky left-0 z-30 bg-card" />
         {days.map((day) => (
            <div
               key={day.toISOString()}
               className="border-b border-l border-border bg-card py-1.5 text-center text-foreground"
            >
               <div className="text-[10px] font-bold tracking-wider">
                  {DAY_LABELS[day.getDay()]}
               </div>
               <div className="text-base font-bold leading-none">
                  {day.getDate()}
               </div>
            </div>
         ))}
      </div>
   );
}
