"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
   DAY_END_HOUR,
   DAY_START_HOUR,
   formatHourLabel,
   formatTimeRange,
   getTwoWeekRange,
   keysToTimeSlots,
   slotKey,
   SLOT_MINUTES,
   type TimeSlot,
} from "@/lib/scheduling/time-slot";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

type AvailabilityCalendarProps = {
   className?: string;
   /** Called when selection changes (merged DB-shaped ranges). */
   onChange?: (slots: TimeSlot[]) => void;
};

export function AvailabilityCalendar({
   className,
   onChange,
}: AvailabilityCalendarProps) {
   const { days, week1, week2, label } = React.useMemo(
      () => getTwoWeekRange(),
      [],
   );
   const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
   const [dragging, setDragging] = React.useState(false);
   const [dragMode, setDragMode] = React.useState<"add" | "remove">("add");
   const [dragVisited, setDragVisited] = React.useState<Set<string>>(
      () => new Set(),
   );
   const [tooltip, setTooltip] = React.useState<{
      text: string;
      x: number;
      y: number;
   } | null>(null);

   const notifyChange = React.useCallback(
      (next: Set<string>) => {
         onChange?.(keysToTimeSlots(next));
      },
      [onChange],
   );

   const applyToSlot = React.useCallback(
      (key: string, mode: "add" | "remove") => {
         setSelected((prev) => {
            const next = new Set(prev);
            if (mode === "add") next.add(key);
            else next.delete(key);
            notifyChange(next);
            return next;
         });
      },
      [notifyChange],
   );

   const handlePointerDown = (key: string) => {
      const mode = selected.has(key) ? "remove" : "add";
      setDragging(true);
      setDragMode(mode);
      setDragVisited(new Set([key]));
      applyToSlot(key, mode);
   };

   const handlePointerEnter = (key: string) => {
      if (!dragging) return;
      setDragVisited((prev) => {
         if (prev.has(key)) return prev;
         const next = new Set(prev);
         next.add(key);
         return next;
      });
      applyToSlot(key, dragMode);
   };

   React.useEffect(() => {
      const endDrag = () => {
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

   const hours = React.useMemo(() => {
      const list: number[] = [];
      for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) list.push(h);
      return list;
   }, []);

   return (
      <div className={cn("mx-auto w-full max-w-6xl space-y-4", className)}>
         <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
               <div className="inline-flex items-center gap-2 rounded-lg border border-[#B8D9F5] bg-[#E8F3FC] px-4 py-2 text-sm text-[#3D7AB8]">
                  <span className="size-2 shrink-0 rounded-full bg-[#5D9CEC]" />
                  Click and drag to highlight your available times in 15-minute
                  blocks
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground"
               >
                  This Week
                  <ChevronDown className="size-4" />
               </button>
               <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm font-semibold tracking-wide text-foreground">
                  {label}
               </div>
            </div>
         </header>

         <div className="overflow-x-auto rounded-xl border border-[#C5DFF5] bg-card shadow-sm">
            <div className="min-w-[900px]">
               <WeekHeaders week1={week1} week2={week2} />
               <DayHeaders week1={week1} week2={week2} />

               <div
                  className="relative grid touch-none select-none"
                  style={{
                     gridTemplateColumns: `4.5rem repeat(14, minmax(0, 1fr))`,
                  }}
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
                                    "border-r border-[#E2E8F0] pr-2 text-right text-xs font-medium text-muted-foreground",
                                    quarter === 0
                                       ? "border-t border-[#E2E8F0] pt-1"
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
                                    day.getDay() === 0 || day.getDay() === 6;
                                 const isSelected = selected.has(key);
                                 const isDragPreview =
                                    dragging && dragVisited.has(key);

                                 return (
                                    <button
                                       key={key}
                                       type="button"
                                       className={cn(
                                          "h-4 w-full border-t border-l border-[#E2E8F0] transition-colors select-none",
                                          quarter > 0 &&
                                             "border-t border-dashed border-[#EEF2F6]",
                                          isWeekend && "bg-muted/80",
                                          isSelected &&
                                             "border-[#5D9CEC] bg-[#7EB8E8]",
                                          isDragPreview &&
                                             !isSelected &&
                                             "border border-dashed border-[#5D9CEC] bg-[#D4EBFA]",
                                          isDragPreview &&
                                             isSelected &&
                                             "border border-dashed border-[#3D7AB8] bg-[#7EB8E8]",
                                       )}
                                       style={{ gridColumn: dayIndex + 2 }}
                                       onPointerDown={(e) => {
                                          e.preventDefault();
                                          handlePointerDown(key);
                                       }}
                                       onPointerEnter={() =>
                                          handlePointerEnter(key)
                                       }
                                       aria-pressed={isSelected}
                                       aria-label={`${day.toLocaleDateString()} ${formatHourLabel(hour)} ${slotMinute} minutes`}
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
                     className="border border-[#E2E8F0] bg-card"
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

function WeekHeaders({
   week1,
   week2,
}: {
   week1: Date[];
   week2: Date[];
}) {
   const fmt = (days: Date[]) => {
      const a = days[0]!;
      const b = days[6]!;
      const range = `${a.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()}–${b.getDate()}`;
      return range;
   };

   return (
      <div
         className="grid border-b border-[#C5DFF5] text-xs font-bold tracking-wide text-[#4A8FD4]"
         style={{ gridTemplateColumns: `4.5rem repeat(14, minmax(0, 1fr))` }}
      >
         <div />
         <div className="col-span-7 border-r-2 border-[#5D9CEC] bg-[#E8F3FC] py-2 pl-3 text-left">
            WEEK 1 · {fmt(week1)}
         </div>
         <div className="col-span-7 bg-[#D4EBFA] py-2 pl-3 text-left">
            WEEK 2 · {fmt(week2)}
         </div>
      </div>
   );
}

function DayHeaders({ week1, week2 }: { week1: Date[]; week2: Date[] }) {
   const renderWeek = (days: Date[]) =>
      days.map((day) => {
         const isWeekend = day.getDay() === 0 || day.getDay() === 6;
         const dayIndex = (day.getDay() + 6) % 7;
         return (
            <div
               key={day.toISOString()}
               className={cn(
                  "border-b border-l border-[#E2E8F0] py-2 text-center",
                  isWeekend
                     ? "bg-muted/70 text-muted-foreground"
                     : "bg-card text-foreground",
               )}
            >
               <div className="text-[10px] font-bold tracking-wider">
                  {DAY_LABELS[dayIndex]}
               </div>
               <div className="text-lg font-bold leading-none">
                  {day.getDate()}
               </div>
            </div>
         );
      });

   return (
      <div
         className="grid"
         style={{ gridTemplateColumns: `4.5rem repeat(14, minmax(0, 1fr))` }}
      >
         <div />
         {renderWeek(week1)}
         {renderWeek(week2)}
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
