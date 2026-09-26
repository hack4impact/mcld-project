"use client";

import { useState } from "react";
import {
   CalendarClock,
   CalendarDays,
   CircleCheck,
   Clock,
   History,
   Hourglass,
   Inbox,
   Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import {
   dayOfWeekLabel,
   serviceStatusLabel,
   serviceTypeLabel,
} from "@/lib/service-labels";
import type {
   LessonStatus,
   PrivateLessonRegistration,
   ProgramRegistration,
   RegistrationView,
} from "../build-registrations";

const FILTERS = [
   { value: "all", label: "All" },
   { value: "programs", label: "Programs" },
   { value: "private_lessons", label: "Private lessons" },
] as const;

type FilterKey = (typeof FILTERS)[number]["value"];

const LESSON_STATUS = {
   pending: { icon: Hourglass, label: "Awaiting coach confirmation" },
   confirmed: { icon: CircleCheck, label: "Confirmed" },
   completed: { icon: CircleCheck, label: "Completed" },
} satisfies Record<LessonStatus, { icon: typeof Clock; label: string }>;

export function RegistrationsView({
   upcoming,
   past,
}: {
   upcoming: RegistrationView[];
   past: RegistrationView[];
}) {
   const [filter, setFilter] = useState<FilterKey>("all");

   if (upcoming.length === 0 && past.length === 0) return <EmptyState />;

   const upcomingFor = (key: FilterKey) =>
      key === "all" ? upcoming : upcoming.filter((r) => r.type === key);

   return (
      <Tabs
         value={filter}
         onValueChange={(v) => setFilter(v as FilterKey)}
         className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden"
      >
         <TabsList className="shrink-0 justify-start border border-border">
            {FILTERS.map(({ value, label }) => (
               <TabsTrigger key={value} value={value}>
                  {label} ({upcomingFor(value).length})
               </TabsTrigger>
            ))}
         </TabsList>

         <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-y-auto pr-1">
            {FILTERS.map(({ value }) => {
               const items = upcomingFor(value);
               return (
                  <TabsContent
                     key={value}
                     value={value}
                     className="flex flex-col gap-4"
                  >
                     {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                           Nothing upcoming in this category.
                        </p>
                     ) : (
                        items.map((r) => (
                           <RegistrationCard key={r.id} registration={r} />
                        ))
                     )}
                  </TabsContent>
               );
            })}

            {past.length > 0 && (
               <section
                  aria-labelledby="past-registrations"
                  className="flex flex-col gap-4"
               >
                  <h2
                     id="past-registrations"
                     className="font-heading text-lg font-semibold"
                  >
                     Past ({past.length})
                  </h2>
                  {past.map((r) => (
                     <RegistrationCard key={r.id} registration={r} />
                  ))}
               </section>
            )}
         </div>
      </Tabs>
   );
}

function EmptyState() {
   return (
      <div className="flex flex-1 items-center justify-center">
         <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
            <Inbox className="size-10 text-muted-foreground" />
            <div className="space-y-1">
               <p className="text-base font-medium">No registrations yet</p>
               <p className="text-sm text-muted-foreground">
                  Services you register for will appear here.
               </p>
            </div>
         </div>
      </div>
   );
}

function RegistrationCard({
   registration,
}: {
   registration: RegistrationView;
}) {
   const { title, type, timing, serviceStatus, participants } = registration;
   const isProgram = registration.type === "programs";

   return (
      <Card size="sm">
         <CardHeader>
            <CardTitle>{title ?? serviceTypeLabel(type)}</CardTitle>
            <CardDescription>
               {isProgram
                  ? programScheduleLabel(registration)
                  : lessonScheduleLabel(registration)}
            </CardDescription>
            <CardAction className="flex flex-wrap justify-end gap-1.5">
               <Badge variant={isProgram ? "default" : "secondary"}>
                  {serviceTypeLabel(type)}
               </Badge>
               <Badge variant="outline">
                  {timing === "upcoming" ? (
                     <CalendarClock data-icon="inline-start" />
                  ) : (
                     <History data-icon="inline-start" />
                  )}
                  {timing === "upcoming" ? "Upcoming" : "Past"}
               </Badge>
               {serviceStatus !== "active" && (
                  <Badge variant="destructive">
                     {serviceStatusLabel(serviceStatus)}
                  </Badge>
               )}
            </CardAction>
         </CardHeader>

         <CardContent>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
               {isProgram ? (
                  <ProgramDetails registration={registration} />
               ) : (
                  <LessonDetails registration={registration} />
               )}
            </div>
         </CardContent>

         <CardFooter>
            <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
               <span className="inline-flex items-center gap-1.5 font-medium">
                  <Users className="size-3.5" />
                  For
               </span>
               {participants.self && <Badge variant="outline">You</Badge>}
               {participants.children.map((c) => (
                  <Badge key={c.id} variant="outline">
                     {c.firstName} {c.lastName}
                  </Badge>
               ))}
            </div>
         </CardFooter>
      </Card>
   );
}

function programScheduleLabel({ schedule }: ProgramRegistration): string {
   return schedule
      ? `${formatDate(schedule.startDate)} – ${formatDate(schedule.endDate)}`
      : "Dates to be announced";
}

function lessonScheduleLabel({
   lessonNumber,
   scheduledLabel,
}: PrivateLessonRegistration): string {
   const when = scheduledLabel ?? "Time to be confirmed by your coach";
   return lessonNumber ? `Lesson ${lessonNumber} · ${when}` : when;
}

function ProgramDetails({
   registration,
}: {
   registration: ProgramRegistration;
}) {
   const { schedule, durationMinutes } = registration;
   const slotsLabel =
      schedule && schedule.slots.length > 0
         ? schedule.slots
              .map((s) => `${dayOfWeekLabel(s.dayOfWeek)} ${s.time}`)
              .join(" · ")
         : null;

   return (
      <>
         {slotsLabel && (
            <span className="inline-flex items-center gap-1.5">
               <CalendarDays className="size-3.5" />
               {slotsLabel}
            </span>
         )}
         <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {durationMinutes} min
         </span>
      </>
   );
}

function LessonDetails({
   registration,
}: {
   registration: PrivateLessonRegistration;
}) {
   const { lessonStatus, durationMinutes, bookedAtLabel } = registration;
   const status = LESSON_STATUS[lessonStatus];

   return (
      <>
         <span className="inline-flex items-center gap-1.5">
            <status.icon className="size-3.5" />
            {status.label}
         </span>
         <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {durationMinutes} min
         </span>
         <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Booked {bookedAtLabel}
         </span>
      </>
   );
}
