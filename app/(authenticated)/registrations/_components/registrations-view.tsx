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
import { EmptyState } from "@/components/page-shell";
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

   if (upcoming.length === 0 && past.length === 0)
      return (
         <EmptyState
            icon={<Inbox />}
            title="No registrations yet"
            description="Services you register for will appear here."
         />
      );

   const upcomingFor = (key: FilterKey) =>
      key === "all" ? upcoming : upcoming.filter((r) => r.type === key);

   return (
      <Tabs
         value={filter}
         onValueChange={(v) => setFilter(v as FilterKey)}
         className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden"
      >
         <TabsList className="shrink-0 justify-start">
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
                     className="grid gap-4 xl:grid-cols-2"
                  >
                     {items.length === 0 ? (
                        <EmptyState
                           className="py-10 xl:col-span-2"
                           icon={<CalendarClock />}
                           title="Nothing upcoming"
                           description="There's nothing scheduled in this category yet."
                        />
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
                     className="text-lg font-semibold"
                  >
                     Past ({past.length})
                  </h2>
                  <div className="grid gap-4 xl:grid-cols-2">
                     {past.map((r) => (
                        <RegistrationCard key={r.id} registration={r} />
                     ))}
                  </div>
               </section>
            )}
         </div>
      </Tabs>
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
      <Card size="sm" className={timing === "past" ? "opacity-80" : undefined}>
         <CardHeader>
            <CardTitle>{title ?? serviceTypeLabel(type)}</CardTitle>
            <CardDescription>
               {isProgram
                  ? programScheduleLabel(registration)
                  : lessonScheduleLabel(registration)}
            </CardDescription>
            <CardAction className="flex flex-wrap justify-end gap-1.5">
               <Badge variant={isProgram ? "info" : "secondary"}>
                  {serviceTypeLabel(type)}
               </Badge>
               <Badge variant={timing === "upcoming" ? "success" : "muted"}>
                  {timing === "upcoming" ? (
                     <CalendarClock data-icon="inline-start" />
                  ) : (
                     <History data-icon="inline-start" />
                  )}
                  {timing === "upcoming" ? "Upcoming" : "Past"}
               </Badge>
               {serviceStatus !== "active" && (
                  <Badge variant="warning">
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
               {participants.self && <Badge variant="secondary">You</Badge>}
               {participants.children.map((c) => (
                  <Badge key={c.id} variant="secondary">
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
