"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
   buildCalendarRange,
   buildHourRange,
   formatHourLabel,
   formatSlotAriaLabel,
   formatTimeRange,
   keysToTimeSlots,
   slotKey,
   SLOT_MINUTES,
   WEEKDAY,
   type TimeSlot,
   type Weekday,
} from "@/lib/scheduling/time-slot";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

type AvailabilityCalendarProps = {
   weeks: number;
   daysOfWeek: Weekday[];
   startHour: number;
   endHour: number;
   embedded?: boolean;
   className?: string;
   /** Called when selection changes (merged DB-shaped ranges). */
   onChange?: (slots: TimeSlot[]) => void;
};

export function AvailabilityCalendar({
   weeks,
   daysOfWeek,
   startHour,
   endHour,
   embedded = false,
   className,
   onChange,
}: AvailabilityCalendarProps) {
   const daysKey = daysOfWeek.join(",");
   const { weeks: weekRanges, days } = React.useMemo(
      () => buildCalendarRange({ weeks, daysOfWeek }),
      [weeks, daysKey, daysOfWeek],
   );
   const columnCount = days.length;
   const gridColumns = `4.5rem repeat(${columnCount}, minmax(0, 1fr))`;
   const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
   const [dragging, setDragging] = React.useState(false);
   const [dragVisited, setDragVisited] = React.useState<Set<string>>(
      () => new Set(),
   );
   const [tooltip, setTooltip] = React.useState<{
      text: string;
      x: number;
      y: number;
   } | null>(null);

   const gridRef = React.useRef<HTMLDivElement>(null);
   const draggingRef = React.useRef(false);
   const dragModeRef = React.useRef<"add" | "remove">("add");
   const activePointerIdRef = React.useRef<number | null>(null);
   const dragStartSelectedRef = React.useRef<Set<string>>(new Set());
   const dragVisitedRef = React.useRef<Set<string>>(new Set());
   const dragStartKeyRef = React.useRef<string | null>(null);
   const dragCurrentKeyRef = React.useRef<string | null>(null);

   const isBlockedSlotKey = React.useCallback((key: string) => {
      const day = new Date(key).getDay();
      return day === WEEKDAY.sun || day === WEEKDAY.sat;
   }, []);

   const { keyToCoord, coordToKey } = React.useMemo(() => {
      const keyToCoordMap = new Map<string, { dayIndex: number; slotIndex: number }>();
      const coordToKeyMap = new Map<string, string>();

      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
         const day = days[dayIndex]!;
         for (let hour = startHour; hour < endHour; hour++) {
            for (let quarter = 0; quarter < 4; quarter++) {
               const slotIndex = (hour - startHour) * 4 + quarter;
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

   React.useEffect(() => {
      onChange?.(keysToTimeSlots(selected));
   }, [selected, onChange]);

   const updateDragVisited = React.useCallback(
      (keys: string[]) => {
         if (keys.length === 0) return;
         const next = new Set<string>();
         for (const k of keys) {
            if (isBlockedSlotKey(k)) continue;
            next.add(k);
         }
         dragVisitedRef.current = next;
         setDragVisited(next);
      },
      [isBlockedSlotKey],
   );

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
         const startKey = dragStartKeyRef.current;
         if (!startKey) return;
         if (dragCurrentKeyRef.current === key) return;
         dragCurrentKeyRef.current = key;
         updateDragVisited(getRangeKeys(startKey, key));
      },
      [getRangeKeys, updateDragVisited],
   );

   const getSlotKeyFromPoint = React.useCallback((x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const slot = el?.closest<HTMLElement>("[data-slot-key]");
      if (slot?.dataset.slotDisabled === "true") return null;
      return slot?.dataset.slotKey ?? null;
   }, []);

   const handleGridPointerMove = React.useCallback(
      (e: React.PointerEvent) => {
         if (!draggingRef.current) return;
         const key = getSlotKeyFromPoint(e.clientX, e.clientY);
         if (key) visitSlot(key);
      },
      [getSlotKeyFromPoint, visitSlot],
   );

   const handleSlotPointerDown = React.useCallback(
      (e: React.PointerEvent, key: string) => {
         e.preventDefault();
         const mode = selected.has(key) ? "remove" : "add";

         draggingRef.current = true;
         dragModeRef.current = mode;
         dragStartSelectedRef.current = new Set(selected);
         dragVisitedRef.current = new Set();
         dragStartKeyRef.current = key;
         dragCurrentKeyRef.current = null;
         activePointerIdRef.current = e.pointerId;
         gridRef.current?.setPointerCapture(e.pointerId);

         setDragging(true);
         setDragVisited(new Set());
         visitSlot(key);
      },
      [selected, visitSlot],
   );

   React.useEffect(() => {
      const endDrag = () => {
         const draggedKeys = [...dragVisitedRef.current];
         if (draggedKeys.length > 0) {
            const mode = dragModeRef.current;
            setSelected((prev) => {
               const next = new Set(prev);
               for (const k of draggedKeys) {
                  if (mode === "add") next.add(k);
                  else next.delete(k);
               }
               return next;
            });
         }

         draggingRef.current = false;
         if (
            gridRef.current &&
            activePointerIdRef.current !== null
         ) {
            try {
               gridRef.current.releasePointerCapture(
                  activePointerIdRef.current,
               );
            } catch {
               /* already released */
            }
         }
         activePointerIdRef.current = null;
         dragStartSelectedRef.current = new Set();
         dragVisitedRef.current = new Set();
         dragStartKeyRef.current = null;
         dragCurrentKeyRef.current = null;
         setDragging(false);
         setDragVisited(new Set());
         setTooltip(null);
      };
      window.addEventListener("pointerup", endDrag);
      return () => window.removeEventListener("pointerup", endDrag);
   }, []);

   React.useEffect(() => {
      if (!dragging || dragVisited.size === 0) {
         setTooltip(null);
         return;
      }
      const dates = [...dragVisited]
         .map((k) => new Date(k))
         .sort((a, b) => a.getTime() - b.getTime());
      const start = dates[0]!;
      const end = new Date(dates[dates.length - 1]!.getTime() + SLOT_MINUTES * 60_000);
      setTooltip({ text: formatTimeRange(start, end), x: 0, y: 0 });
   }, [dragging, dragVisited]);

   const slotCount = selected.size;
   const hoursTotal = (slotCount * SLOT_MINUTES) / 60;

   const hours = React.useMemo(
      () => buildHourRange(startHour, endHour),
      [startHour, endHour],
   );

   return (
      <div className={cn("mx-auto w-full max-w-6xl", className)}>
         <div
            className={cn(
               "overflow-x-auto bg-card",
               !embedded && "rounded-xl border border-[#C5DFF5] shadow-sm",
            )}
         >
            <div
               className="min-w-[720px]"
               style={{ minWidth: `${Math.max(720, 80 + columnCount * 56)}px` }}
            >
               <WeekHeaders weeks={weekRanges} gridColumns={gridColumns} />
               <DayHeaders days={days} gridColumns={gridColumns} />

               <div
                  ref={gridRef}
                  className="relative grid touch-none select-none"
                  style={{ gridTemplateColumns: gridColumns }}
                  onPointerMove={handleGridPointerMove}
                  onPointerLeave={() => dragging && setTooltip(null)}
               >
                  {hours.map((hour) =>
                     [0, 1, 2, 3].map((quarter) => {
                        const slotMinute = quarter * SLOT_MINUTES;
                        const showHourLabel = quarter === 0;

                        return (
                           <React.Fragment key={`${hour}-${quarter}`}>
                              <div
                                 className={cn(
                                    "sticky left-0 z-20 h-4 bg-card pr-2 text-right text-xs font-medium text-muted-foreground",
                                    quarter === 0
                                       ? "border-t border-[#E2E8F0]"
                                       : "border-t border-dashed border-[#EEF2F6]",
                                    showHourLabel && "flex items-start justify-end",
                                 )}
                                 style={{
                                    gridRow: "span 1",
                                    gridColumn: 1,
                                 }}
                              >
                                 {showHourLabel ? formatHourLabel(hour) : null}
                              </div>

                              {days.map((day, dayIndex) => {
                                 const slotDate = new Date(day);
                                 slotDate.setHours(hour, slotMinute, 0, 0);
                                 const key = slotKey(slotDate);
                                 const isWeekend =
                                    day.getDay() === WEEKDAY.sun ||
                                    day.getDay() === WEEKDAY.sat;
                                 const isBlocked = isWeekend;
                                 const isSelected = selected.has(key);
                                 const isDragPreview =
                                    dragging && dragVisited.has(key);
                                 const wasSelectedAtDragStart =
                                    dragStartSelectedRef.current.has(key);
                                 const isAddPreview =
                                    isDragPreview &&
                                    dragModeRef.current === "add" &&
                                    !isSelected;
                                 const isRemovePreview =
                                    isDragPreview &&
                                    dragModeRef.current === "remove" &&
                                    wasSelectedAtDragStart;

                                 return (
                                    <button
                                       key={key}
                                       type="button"
                                       data-slot-key={key}
                                       className={cn(
                                          "h-4 w-full border-t border-l border-[#E2E8F0] [border-left-style:dashed] transition-colors select-none",
                                          quarter > 0 &&
                                             "border-l border-t border-dashed border-[#EEF2F6]",
                                          isBlocked && "bg-[#D4DCE6]",
                                          isSelected &&
                                             "border-[#5D9CEC] bg-[#7EB8E8]",
                                          isAddPreview &&
                                             "border border-dashed border-[#5D9CEC] bg-[#D4EBFA]",
                                          isRemovePreview &&
                                             "border border-dashed border-[#5D9CEC] bg-[#D4EBFA]",
                                       )}
                                       style={{ gridColumn: dayIndex + 2 }}
                                       disabled={isBlocked}
                                       data-slot-disabled={isBlocked ? "true" : undefined}
                                       onPointerDown={(e) =>
                                          handleSlotPointerDown(e, key)
                                       }
                                       aria-pressed={isSelected}
                                       aria-disabled={isBlocked}
                                       aria-label={formatSlotAriaLabel(
                                          day,
                                          hour,
                                          slotMinute,
                                       )}
                                    />
                                 );
                              })}
                           </React.Fragment>
                        );
                     }),
                  )}

                  {tooltip && dragging ? (
                     <div
                        className="pointer-events-none fixed z-50 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
                        style={{
                           left: "50%",
                           top: "40%",
                            transform: "translate(-50%, -100%)",
                        }}
                     >
                        {tooltip.text}
                     </div>
                  ) : null}
               </div>
            </div>

            <footer className="flex flex-col gap-4 border-t border-[#E2E8F0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
               <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-semibold tracking-wider text-foreground/70">
                     YOUR SELECTIONS:
                  </span>
                  <LegendItem
                     className="border border-[#B6C1CF] bg-[#D4DCE6]"
                     label="Not available"
                  />
                  <LegendItem
                     className="bg-[#7EB8E8]"
                     label="Available"
                  />
                  <LegendItem
                     className="border border-dashed border-[#5D9CEC] bg-[#D4EBFA]"
                     label="Selecting... (drag)"
                  />
               </div>
               <p className="text-sm font-semibold text-[#4A8FD4]">
                  {slotCount} slot{slotCount === 1 ? "" : "s"} selected ·{" "}
                  {hoursTotal.toFixed(2)} hrs total
               </p>
            </footer>
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
         className="grid border-b border-[#C5DFF5] text-xs font-bold tracking-wide text-[#4A8FD4]"
         style={{ gridTemplateColumns: gridColumns }}
      >
         <div className="sticky left-0 z-30 bg-card" />
         {weeks.map((weekDays, index) => (
            <div
               key={index}
               className={cn(
                  "py-2 pl-3 text-left",
                  index % 2 === 0 ? "bg-[#E8F3FC]" : "bg-[#D4EBFA]",
                  index < weeks.length - 1 && "border-r-2 border-[#5D9CEC]",
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
         {days.map((day) => {
            const isWeekend =
               day.getDay() === WEEKDAY.sun || day.getDay() === WEEKDAY.sat;
            return (
               <div
                  key={day.toISOString()}
                  className={cn(
                     "border-b border-l border-[#E2E8F0] py-2 text-center",
                     isWeekend
                           ? "bg-[#CDD6E1] text-foreground/70"
                        : "bg-card text-foreground",
                  )}
               >
                  <div className="text-[10px] font-bold tracking-wider">
                     {DAY_LABELS[day.getDay()]}
                  </div>
                  <div className="text-lg font-bold leading-none">
                     {day.getDate()}
                  </div>
               </div>
            );
         })}
      </div>
   );
}

function LegendItem({
   className,
   label,
}: {
   className?: string;
   label: string;
}) {
   return (
      <span className="inline-flex items-center gap-1.5">
         <span className={cn("size-4 rounded-sm", className)} />
         {label}
      </span>
   );
}
