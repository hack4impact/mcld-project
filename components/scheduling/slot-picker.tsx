"use client";

import * as React from "react";
import { CalendarSearch, ChevronLeft, ChevronRight, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
   listBookableSlots,
   type ListBookableSlotsResult,
} from "@/app/private-lessons/actions";
import {
   addDays,
   formatShortDate,
   formatTime,
   formatTimeZone,
   startOfWeekMonday,
} from "@/lib/availability-editor";
import type { BookableSlot } from "@/lib/booking-slots";
import { cn } from "@/lib/utils";

export type Loaded = Extract<
   ListBookableSlotsResult,
   { slots: BookableSlot[] }
>;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SlotPicker({
   serviceId,
   value,
   onChange,
   refreshKey = 0,
}: {
   serviceId: string;
   value: BookableSlot | null;
   onChange: (slot: BookableSlot | null) => void;
   refreshKey?: number;
}) {
   const [weekStart, setWeekStart] = React.useState<string | null>(null);
   const [data, setData] = React.useState<Loaded | null>(null);
   const [error, setError] = React.useState<string | null>(null);
   const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      listBookableSlots(
         weekStart
            ? { serviceId, from: weekStart, to: addDays(weekStart, 6) }
            : { serviceId },
      ).then((result) => {
         if (cancelled) return;
         setLoading(false);
         if ("error" in result) {
            setError(result.error);
            return;
         }
         setData(result);
      });
      return () => {
         cancelled = true;
      };
   }, [serviceId, weekStart, refreshKey]);

   return (
      <SlotWeekView
         data={data}
         weekStart={weekStart}
         loading={loading}
         error={error}
         value={value}
         onChange={onChange}
         onWeekChange={setWeekStart}
      />
   );
}

export function SlotWeekView({
   data,
   weekStart,
   loading,
   error,
   value,
   onChange,
   onWeekChange,
}: {
   data: Loaded | null;
   weekStart: string | null;
   loading: boolean;
   error: string | null;
   value: BookableSlot | null;
   onChange: (slot: BookableSlot | null) => void;
   onWeekChange: (weekStart: string) => void;
}) {
   const currentWeek = data ? startOfWeekMonday(data.today) : null;
   const shownFrom = weekStart ?? data?.from ?? null;
   const days = shownFrom
      ? Array.from({ length: 7 }, (_, i) => addDays(shownFrom, i))
      : [];
   const slotsByDate = new Map<string, BookableSlot[]>();
   for (const slot of data?.slots ?? []) {
      const list = slotsByDate.get(slot.date) ?? [];
      list.push(slot);
      slotsByDate.set(slot.date, list);
   }

   function goToWeek(date: string) {
      onWeekChange(startOfWeekMonday(date));
   }

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
               <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous week"
                  disabled={
                     loading ||
                     !shownFrom ||
                     !currentWeek ||
                     shownFrom <= currentWeek
                  }
                  onClick={() => shownFrom && goToWeek(addDays(shownFrom, -7))}
               >
                  <ChevronLeft />
               </Button>
               <span className="min-w-32 text-center text-sm font-semibold tabular-nums sm:min-w-40">
                  {shownFrom
                     ? `${formatShortDate(shownFrom).slice(5)} – ${formatShortDate(addDays(shownFrom, 6)).slice(5)}`
                     : " "}
               </span>
               <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next week"
                  disabled={loading || !shownFrom}
                  onClick={() => shownFrom && goToWeek(addDays(shownFrom, 7))}
               >
                  <ChevronRight />
               </Button>
               {currentWeek && shownFrom && shownFrom !== currentWeek && (
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     disabled={loading}
                     onClick={() => onWeekChange(currentWeek)}
                  >
                     This week
                  </Button>
               )}
            </div>
            {data && (
               <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="size-3.5" />
                  Times shown in {formatTimeZone(data.timezone, data.today)}
               </p>
            )}
         </div>

         {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
               {error}
            </p>
         ) : loading && !data ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
               {Array.from({ length: 7 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
               ))}
            </div>
         ) : data && data.slots.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
               <CalendarSearch className="size-6 text-muted-foreground" />
               <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">
                     No open times this week
                  </p>
                  <p className="text-sm text-muted-foreground">
                     {data.nextAvailableDate
                        ? "Try another week, or jump to the next open time."
                        : "There are no open times in the next 12 months. Please contact us to book this lesson."}
                  </p>
               </div>
               {data.nextAvailableDate && (
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => goToWeek(data.nextAvailableDate!)}
                  >
                     Next available: {formatShortDate(data.nextAvailableDate)}
                     <ChevronRight />
                  </Button>
               )}
            </div>
         ) : (
            <div
               className={cn(
                  "grid grid-cols-1 gap-3 transition-opacity md:grid-cols-7",
                  loading && "opacity-50",
               )}
               aria-busy={loading}
            >
               {days.map((date, index) => {
                  const slots = slotsByDate.get(date) ?? [];
                  const isPast = data ? date < data.today : false;
                  return (
                     <section
                        key={date}
                        aria-label={formatShortDate(date)}
                        className={cn(
                           "flex flex-col gap-2",
                           slots.length === 0 && "hidden md:flex",
                           isPast && "opacity-50",
                        )}
                     >
                        <p className="flex items-baseline gap-1 text-xs font-semibold text-muted-foreground uppercase">
                           {DAY_NAMES[index]}
                           <span className="text-sm font-semibold text-foreground">
                              {Number(date.slice(8))}
                           </span>
                        </p>
                        {slots.length === 0 ? (
                           <span className="text-xs text-muted-foreground">
                              —
                           </span>
                        ) : (
                           <div className="grid grid-cols-3 gap-1.5 md:grid-cols-1">
                              {slots.map((slot) => {
                                 const selected = value?.start === slot.start;
                                 return (
                                    <Button
                                       key={slot.start}
                                       type="button"
                                       size="sm"
                                       variant={
                                          selected ? "default" : "outline"
                                       }
                                       aria-pressed={selected}
                                       aria-label={`${formatShortDate(slot.date)} at ${formatTime(slot.time)}`}
                                       className="tabular-nums"
                                       onClick={() =>
                                          onChange(selected ? null : slot)
                                       }
                                    >
                                       {formatTime(slot.time)}
                                    </Button>
                                 );
                              })}
                           </div>
                        )}
                     </section>
                  );
               })}
            </div>
         )}
      </div>
   );
}
