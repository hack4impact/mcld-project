"use client";

import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   addDays,
   formatShortDate,
   formatTime,
   formatTimeZone,
   type PreviewDay,
} from "@/lib/availability-editor";
import { cn } from "@/lib/utils";

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LegendSwatch({
   className,
   children,
}: {
   className: string;
   children: React.ReactNode;
}) {
   return (
      <span className="flex items-center gap-1.5">
         <span className={cn("size-2.5 rounded-full", className)} />
         {children}
      </span>
   );
}

function DayCell({ day, today }: { day: PreviewDay; today: string }) {
   const dayNumber = Number(day.date.slice(8));
   const isToday = day.date === today;
   const empty = day.windows.length === 0 && day.override !== "day_off";

   return (
      <div
         className={cn(
            "flex min-h-24 flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-2",
            day.isPast && "border-dashed bg-transparent opacity-50",
            day.override === "custom" && "border-warning/50 bg-warning-soft/40",
            day.override === "day_off" && "bg-muted/60",
            empty && !day.isPast && "hidden md:flex",
         )}
      >
         <div className="flex items-center justify-between gap-1">
            <span
               className={cn(
                  "text-xs font-semibold text-muted-foreground",
                  isToday &&
                     "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
               )}
            >
               <span className="md:hidden">{formatShortDate(day.date)}</span>
               <span className="hidden md:inline">{dayNumber}</span>
            </span>
            {day.override === "custom" && (
               <span className="text-[0.65rem] font-semibold tracking-wide text-warning uppercase">
                  Override
               </span>
            )}
         </div>
         {day.override === "day_off" ? (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
               <CalendarOff className="size-3.5" />
               Day off
            </span>
         ) : (
            day.windows.map((window) => (
               <span
                  key={`${window.start}-${window.end}`}
                  className={cn(
                     "flex flex-wrap gap-x-1 rounded-md px-1.5 py-1 text-[0.7rem] leading-tight font-semibold tabular-nums md:flex-col",
                     window.source === "override"
                        ? "bg-warning-soft text-warning"
                        : "bg-primary/10 text-primary",
                  )}
               >
                  <span>{formatTime(window.start)}</span>
                  <span className="font-normal whitespace-nowrap opacity-70">
                     to {formatTime(window.end)}
                  </span>
               </span>
            ))
         )}
      </div>
   );
}

export function AvailabilityPreview({
   weeks,
   today,
   timezone,
   canGoBack,
   loading,
   onPrevious,
   onNext,
}: {
   weeks: PreviewDay[][];
   today: string;
   timezone: string;
   canGoBack: boolean;
   loading: boolean;
   onPrevious: () => void;
   onNext: () => void;
}) {
   const first = weeks[0]?.[0]?.date;
   const last = weeks.at(-1)?.at(-1)?.date;

   return (
      <Card>
         <CardHeader className="border-b">
            <CardTitle className="text-base font-semibold">Preview</CardTitle>
            <CardDescription>
               Your configured weekly hours combined with date overrides. Booked
               lessons aren&apos;t subtracted, so these windows aren&apos;t
               guaranteed free slots. Times in {formatTimeZone(timezone, today)}
               .
            </CardDescription>
            <CardAction className="flex items-center gap-1">
               <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous weeks"
                  disabled={!canGoBack || loading}
                  onClick={onPrevious}
               >
                  <ChevronLeft />
               </Button>
               <span className="min-w-36 text-center text-sm font-medium text-foreground tabular-nums">
                  {first && last
                     ? `${formatShortDate(first).slice(5)} – ${formatShortDate(last).slice(5)}`
                     : ""}
               </span>
               <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next weeks"
                  disabled={loading}
                  onClick={onNext}
               >
                  <ChevronRight />
               </Button>
            </CardAction>
         </CardHeader>
         <CardContent
            className={cn(
               "flex flex-col gap-4 transition-opacity",
               loading && "opacity-60",
            )}
            aria-busy={loading}
         >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
               <LegendSwatch className="bg-primary/60">
                  Weekly hours
               </LegendSwatch>
               <LegendSwatch className="bg-warning">Date override</LegendSwatch>
               <LegendSwatch className="bg-muted-foreground/40">
                  Day off
               </LegendSwatch>
            </div>
            <div className="hidden grid-cols-7 gap-2 md:grid">
               {DAY_HEADERS.map((label) => (
                  <span
                     key={label}
                     className="px-2 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                     {label}
                  </span>
               ))}
            </div>
            {weeks.map((week) => (
               <section
                  key={week[0]!.date}
                  aria-label={`Week of ${formatShortDate(week[0]!.date)}`}
                  className="flex flex-col gap-2"
               >
                  <p className="text-xs font-semibold text-muted-foreground md:hidden">
                     {formatShortDate(week[0]!.date)} –{" "}
                     {formatShortDate(addDays(week[0]!.date, 6))}
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
                     {week.map((day) => (
                        <DayCell key={day.date} day={day} today={today} />
                     ))}
                  </div>
               </section>
            ))}
         </CardContent>
      </Card>
   );
}
