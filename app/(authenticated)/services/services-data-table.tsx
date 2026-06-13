"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Archive, ArchiveRestore, Ban, Pencil, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import { formatDate } from "@/lib/format";
import { statusBadgeClass } from "@/lib/service-status";
import { Badge } from "@/components/ui/badge";

import { setServiceStatus } from "@/app/(authenticated)/services/actions";
import type { ServiceView } from "@/app/(authenticated)/services/queries";

export function ServicesDataTable({
   services,
   onEdit,
}: {
   services: ServiceView[];
   onEdit: (service: ServiceView) => void;
}) {
   const [pending, startTransition] = React.useTransition();

   const runStatus = React.useCallback(
      (id: string, next: "active" | "disabled" | "archived") => {
         const fd = new FormData();
         fd.set("service_id", id);
         fd.set("status", next);
         startTransition(() => {
            setServiceStatus(null, fd);
         });
      },
      [],
   );

   const columns = React.useMemo<ColumnDef<ServiceView>[]>(
      () => [
         {
            accessorKey: "title",
            header: "Program",
            cell: ({ row }) => (
               <span className="font-medium">{row.original.title ?? "—"}</span>
            ),
         },
         {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
               <span
                  className={
                     "inline-flex rounded-full px-2 py-0.5 text-xs capitalize " +
                     statusBadgeClass(row.original.status)
                  }
               >
                  {row.original.status}
               </span>
            ),
         },{
            id: "kids",
            header: "For Children",
            cell: ({ row }) => {
               const s = row.original;
               if (s.type !== "programs" || !s.isForChildren) {
                  return (
                     <Badge variant="outline" className="text-xs">
                     No
                  </Badge>
                  )
               }
               return (
                  <Badge variant="secondary" className="text-xs">
                     Yes
                  </Badge>
               );
            },
         },
         {
            id: "startDate",
            header: "Start Date",
            cell: ({ row }) => {
               const s = row.original.scheduledAt;
               return s ? formatDate(s.startDate) : "—";
            },
         },
         {
            id: "endDate",
            header: "End Date",
            cell: ({ row }) => {
               const s = row.original.scheduledAt;
               return s ? formatDate(s.endDate) : "—";
            },
         },
         {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
               const s = row.original;
               return (
                  <div className="flex items-center justify-end gap-0.5">
                     {(s.status === "active" || s.status === "disabled") && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label="Edit service"
                                 onClick={() => onEdit(s)}
                              >
                                 <Pencil />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                     )}
                     {s.status === "active" && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label="Disable service"
                                 disabled={pending}
                                 onClick={() => runStatus(s.id, "disabled")}
                              >
                                 <Ban />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Disable</TooltipContent>
                        </Tooltip>
                     )}
                     {s.status === "disabled" && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label="Re-enable service"
                                 disabled={pending}
                                 onClick={() => runStatus(s.id, "active")}
                              >
                                 <Power />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Re-enable</TooltipContent>
                        </Tooltip>
                     )}
                     {(s.status === "active" || s.status === "disabled") && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label="Archive service"
                                 disabled={pending}
                                 onClick={() => runStatus(s.id, "archived")}
                              >
                                 <Archive />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Archive</TooltipContent>
                        </Tooltip>
                     )}
                     {s.status === "archived" && (
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="icon-sm"
                                 aria-label="Restore service"
                                 disabled={pending}
                                 onClick={() => runStatus(s.id, "active")}
                              >
                                 <ArchiveRestore />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>Restore</TooltipContent>
                        </Tooltip>
                     )}
                  </div>
               );
            },
         },
      ],
      [pending, runStatus, onEdit],
   );

   return (
      <DataTable
         columns={columns}
         data={services}
         emptyMessage="No services found."
         rowLabel={(n) => `${n} service${n === 1 ? "" : "s"}`}
      />
   );
}
