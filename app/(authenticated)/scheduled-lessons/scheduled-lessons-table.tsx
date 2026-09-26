"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { DataTable } from "@/components/data-table";
import type { ScheduledLessonView } from "./queries";

function formatSlot(iso: string): string {
   const d = new Date(iso);
   return Number.isNaN(d.getTime()) ? iso : format(d, "LLL d, h:mm a");
}

export function ScheduledLessonsTable({
   lessons,
}: {
   lessons: ScheduledLessonView[];
}) {
   const columns = React.useMemo<ColumnDef<ScheduledLessonView>[]>(
      () => [
         {
            accessorKey: "serviceTitle",
            header: "Service",
            cell: ({ row }) => (
               <span className="font-medium">
                  {row.original.serviceTitle ?? "—"}
               </span>
            ),
         },
         {
            accessorKey: "clientName",
            header: "Client",
            cell: ({ row }) => row.original.clientName || "—",
         },
         {
            id: "scheduledAt",
            header: "Scheduled at",
            cell: ({ row }) => {
               const s = row.original.scheduledAt;
               return s ? format(new Date(s), "LLL d, yyyy h:mm a") : (
                  <span className="text-muted-foreground">Not scheduled</span>
               );
            },
         },
         {
            id: "meetingUrl",
            header: "Meeting",
            cell: ({ row }) => {
               const url = row.original.meetingUrl;
               return url ? (
                  <a
                     href={url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-primary underline underline-offset-2"
                  >
                     Join
                  </a>
               ) : (
                  <span className="text-muted-foreground">—</span>
               );
            },
         },
         {
            id: "selectedTimeSlots",
            header: "Requested slots",
            cell: ({ row }) => {
               const slots = row.original.selectedTimeSlots;
               if (slots.length === 0)
                  return <span className="text-muted-foreground">—</span>;
               return (
                  <ul className="flex flex-col gap-0.5 text-xs">
                     {slots.map((slot, i) => (
                        <li key={i}>
                           {formatSlot(slot.start)} – {formatSlot(slot.end)}
                        </li>
                     ))}
                  </ul>
               );
            },
         },
      ],
      [],
   );

   return (
      <DataTable
         columns={columns}
         data={lessons}
         emptyMessage="No upcoming scheduled lessons."
         rowLabel={(n) => `${n} lesson${n === 1 ? "" : "s"}`}
      />
   );
}
