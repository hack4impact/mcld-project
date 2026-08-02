"use client";

import { useState } from "react";
import { CalendarDays, Clock, Inbox, User, Users } from "lucide-react";
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
import { dayOfWeekLabel, serviceTypeLabel } from "@/lib/service-labels";
import type { RegistrationView } from "../queries";

type FilterKey = "all" | "programs" | "private_lessons";

export function RegistrationsView({
   registrations,
}: {
   registrations: RegistrationView[];
}) {
   const [filter, setFilter] = useState<FilterKey>("all");

   const counts = {
      all: registrations.length,
      programs: registrations.filter((r) => r.type === "programs").length,
      private_lessons: registrations.filter(
         (r) => r.type === "private_lessons",
      ).length,
   };

   const visible =
      filter === "all"
         ? registrations
         : registrations.filter((r) => r.type === filter);

   if (registrations.length === 0) return <EmptyState />;

   return (
      <Tabs
         value={filter}
         onValueChange={(v) => setFilter(v as FilterKey)}
         className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden"
      >
         <TabsList className="h-auto min-h-8 shrink-0 justify-start border border-border">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="programs">
               Programs ({counts.programs})
            </TabsTrigger>
            <TabsTrigger value="private_lessons">
               Private lessons ({counts.private_lessons})
            </TabsTrigger>
         </TabsList>

         <TabsContent
            value={filter}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 focus-visible:outline-none"
         >
            {visible.length === 0 ? (
               <p className="text-sm text-muted-foreground">
                  Nothing in this category.
               </p>
            ) : (
               visible.map((r) => (
                  <RegistrationCard key={r.serviceId} registration={r} />
               ))
            )}
         </TabsContent>
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
   const { title, type, schedule, durationMinutes, isForChildren, children } =
      registration;
   const scheduleLabel = schedule
      ? `${formatDate(schedule.startDate)} – ${formatDate(schedule.endDate)}`
      : "Scheduled after booking";
   const slotsLabel =
      schedule && schedule.slots.length > 0
         ? schedule.slots
              .map((s) => `${dayOfWeekLabel(s.dayOfWeek)} ${s.time}`)
              .join(" · ")
         : null;

   return (
      <Card size="sm">
         <CardHeader>
            <CardTitle>{title ?? "Untitled service"}</CardTitle>
            <CardDescription>{scheduleLabel}</CardDescription>
            <CardAction>
               <Badge variant="secondary">{serviceTypeLabel(type)}</Badge>
            </CardAction>
         </CardHeader>

         <CardContent>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            </div>
         </CardContent>

         <CardFooter>
            {isForChildren && children.length > 0 ? (
               <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                     <Users className="size-3.5" />
                     {children.length === 1 ? "Child" : "Children"}
                  </span>
                  {children.map((c) => (
                     <Badge key={c.id} variant="outline">
                        {c.firstName} {c.lastName}
                     </Badge>
                  ))}
               </div>
            ) : (
               <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="size-3.5" />
                  Registered as yourself
               </span>
            )}
         </CardFooter>
      </Card>
   );
}
