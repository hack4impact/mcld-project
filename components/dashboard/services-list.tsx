"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ServiceFormDialog } from "@/components/dashboard/service-form-dialog";
import { ServiceRowActions } from "@/components/dashboard/service-row-actions";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Button } from "@/components/ui/button";
import type {
   ServiceListItem,
   ServiceStatus,
   ServiceType,
} from "@/lib/services/service-types";
import { cn } from "@/lib/utils";

type Coach = { id: string; firstName: string; lastName: string };

type ServicesListProps = {
   type: ServiceType;
   title: string;
   items: ServiceListItem[];
   total: number;
   page: number;
   pageSize: number;
   totalPages: number;
   coaches: Coach[];
};

function formatDate(value: string | null) {
   if (!value) return "—";
   return new Date(value + "T00:00:00").toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
   });
}

function StatusBadge({ status }: { status: ServiceStatus }) {
   const isActive = status === "active";
   return (
      <span className="inline-flex items-center gap-2 text-sm">
         <span
            className={cn(
               "size-2 rounded-full",
               isActive ? "bg-emerald-500" : "bg-gray-400",
            )}
         />
         <span className="capitalize">{status}</span>
      </span>
   );
}

export function ServicesList({
   type,
   title,
   items,
   total,
   page,
   pageSize,
   totalPages,
   coaches,
}: ServicesListProps) {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editing, setEditing] = useState<ServiceListItem | null>(null);

   const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
   const showingTo = Math.min(page * pageSize, total);

   function pageHref(nextPage: number) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      return `${pathname}?${params.toString()}`;
   }

   function openCreate() {
      setEditing(null);
      setDialogOpen(true);
   }

   function openEdit(item: ServiceListItem) {
      setEditing(item);
      setDialogOpen(true);
   }

   return (
      <>
         <div className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-[#1a3d52]">{title}</h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
               <StatusFilter />
               <Button
                  type="button"
                  onClick={openCreate}
                  className="bg-[#1a3d52] text-white hover:bg-[#2d5f7a]"
               >
                  Add {type === "programs" ? "program" : "lesson"}
               </Button>
            </div>
         </div>

         <div className="mx-6 overflow-hidden rounded-lg border border-[#d4e4ed] bg-white">
            <table className="w-full text-left text-sm">
               <thead className="border-b border-[#d4e4ed] bg-[#f0f7fa] text-xs font-bold tracking-wide text-[#1a3d52] uppercase">
                  <tr>
                     <th className="px-4 py-3">
                        {type === "programs" ? "Program" : "Lesson"}
                     </th>
                     <th className="px-4 py-3">Status</th>
                     {type === "programs" && (
                        <>
                           <th className="px-4 py-3">Start</th>
                           <th className="px-4 py-3">End</th>
                        </>
                     )}
                     <th className="px-4 py-3">Price</th>
                     <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {items.length === 0 ? (
                     <tr>
                        <td
                           colSpan={type === "programs" ? 6 : 4}
                           className="px-4 py-12 text-center text-[#6b8fa3]"
                        >
                           No services found. Add one to get started.
                        </td>
                     </tr>
                  ) : (
                     items.map((item) => (
                        <tr
                           key={item.id}
                           className="border-b border-[#eef4f7] last:border-0"
                        >
                           <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="size-12 shrink-0 rounded bg-[#d4e4ed]" />
                                 <div>
                                    <p className="font-semibold text-[#1a3d52]">
                                       {item.catalog.name}
                                    </p>
                                    <p className="text-xs text-[#6b8fa3]">
                                       {item.durationMinutes} min
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-4 py-4">
                              <StatusBadge status={item.status} />
                           </td>
                           {type === "programs" && (
                              <>
                                 <td className="px-4 py-4 text-[#1a3d52]">
                                    {formatDate(item.startDate)}
                                 </td>
                                 <td className="px-4 py-4 text-[#1a3d52]">
                                    {formatDate(item.endDate)}
                                 </td>
                              </>
                           )}
                           <td className="px-4 py-4 text-[#1a3d52]">
                              {item.priceLabel}
                           </td>
                           <td className="px-4 py-4">
                              <ServiceRowActions
                                 serviceId={item.id}
                                 status={item.status}
                                 onEdit={() => openEdit(item)}
                              />
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>

         <div className="flex flex-col items-center justify-between gap-4 px-6 py-4 text-sm text-[#6b8fa3] sm:flex-row">
            <p>
               Showing {showingFrom}–{showingTo} of {total}{" "}
               {type === "programs" ? "programs" : "lessons"}
            </p>
            <div className="flex items-center gap-2">
               {page > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                     <Link href={pageHref(page - 1)}>Previous</Link>
                  </Button>
               ) : (
                  <Button variant="outline" size="sm" disabled>
                     Previous
                  </Button>
               )}
               <span className="px-2 font-medium text-[#1a3d52]">
                  {page} / {totalPages}
               </span>
               {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild>
                     <Link href={pageHref(page + 1)}>Next</Link>
                  </Button>
               ) : (
                  <Button variant="outline" size="sm" disabled>
                     Next
                  </Button>
               )}
            </div>
         </div>

         <ServiceFormDialog
            key={editing?.id ?? "create"}
            open={dialogOpen}
            onClose={() => {
               setDialogOpen(false);
               setEditing(null);
            }}
            type={type}
            coaches={coaches}
            service={
               editing
                  ? {
                       id: editing.id,
                       name: editing.catalog.name,
                       description: editing.catalog.description,
                       priceDollars: editing.catalog.priceCents / 100,
                       durationMinutes: editing.durationMinutes,
                       startDate: editing.startDate,
                       endDate: editing.endDate,
                       coachId: editing.coachId,
                    }
                  : undefined
            }
         />
      </>
   );
}
