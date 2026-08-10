"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsersDataTable } from "@/app/(authenticated)/users/_components/users-data-table";
import { formatDate } from "@/lib/format";
import type { KidRegistration } from "../queries";
import { ChildInfoModal } from "./child-info-modal";
import { STATUS_VARIANT, GENDER_LABELS } from "./constants";

export function KidTable({ registrations }: { registrations: KidRegistration[] }) {
   const [selected, setSelected] = useState<KidRegistration | null>(null);
   const [modalOpen, setModalOpen] = useState(false);

   const columns = useMemo<ColumnDef<KidRegistration>[]>(
      () => [
         {
            id: "child",
            header: "Child",
            meta: { colWidth: "22%" },
            cell: ({ row }) => (
               <span className="font-medium text-sm">
                  {row.original.child.firstName} {row.original.child.lastName}
               </span>
            ),
         },
         {
            id: "dob",
            header: "Date of Birth",
            meta: { colWidth: "16%" },
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">
                  {formatDate(row.original.child.dob)}
               </span>
            ),
         },
         {
            id: "gender",
            header: "Gender",
            meta: { colWidth: "16%" },
            cell: ({ row }) => (
               <span className="text-sm text-muted-foreground">
                  {GENDER_LABELS[row.original.child.gender] ?? row.original.child.gender}
               </span>
            ),
         },
         {
            id: "parent",
            header: "Parent",
            meta: { colWidth: "20%" },
            cell: ({ row }) => (
               <span className="text-sm">
                  {row.original.parent.firstName} {row.original.parent.lastName}
               </span>
            ),
         },
         {
            id: "status",
            header: "Status",
            meta: { colWidth: "14%" },
            cell: ({ row }) => (
               <Badge
                  variant={STATUS_VARIANT[row.original.status] ?? "secondary"}
                  className="capitalize"
               >
                  {row.original.status.replace(/_/g, " ")}
               </Badge>
            ),
         },
         {
            id: "info",
            header: () => <div className="text-right">Info</div>,
            meta: { colWidth: "12%", thClassName: "text-right", tdClassName: "text-right" },
            cell: ({ row }) => (
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View child profile"
                        onClick={() => {
                           setSelected(row.original);
                           setModalOpen(true);
                        }}
                     >
                        <Info />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>View profile</TooltipContent>
               </Tooltip>
            ),
         },
      ],
      [],
   );

   return (
      <>
         <UsersDataTable
            columns={columns}
            data={registrations}
            emptyMessage="No registrations yet."
            rowLabel={(n) => `${n} registration${n === 1 ? "" : "s"}`}
         />
         <ChildInfoModal
            registration={selected}
            open={modalOpen}
            onOpenChange={setModalOpen}
         />
      </>
   );
}
