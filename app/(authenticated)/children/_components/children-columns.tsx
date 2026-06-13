"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
import type { ChildView } from "../queries";
import { ChildActionsCell } from "./child-actions-cell";

export function getChildrenColumns(
   onEdit: (child: ChildView) => void,
): ColumnDef<ChildView>[] {
   return [
      {
         id: "profile",
         header: "Child",
         meta: {
            colWidth: "40%",
            tdClassName: "whitespace-normal align-middle",
         },
         cell: ({ row }) => {
            const c = row.original;
            const fullName = `${c.firstName} ${c.lastName}`;
            return (
               <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
                  <Avatar>
                     <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                        {`${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase()}
                     </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                     <span className="truncate text-sm font-semibold">
                        {fullName}
                     </span>
                     <span className="truncate text-xs text-muted-foreground capitalize">
                        {c.gender.replaceAll("_", " ")}
                     </span>
                  </div>
               </div>
            );
         },
      },
      {
         id: "dob",
         header: "Date of birth",
         meta: { colWidth: "22%" },
         cell: ({ row }) => (
            <span className="block min-w-0 truncate text-sm text-muted-foreground">
               {formatDate(row.original.dob)}
            </span>
         ),
      },
      {
         id: "emergencyContacts",
         header: "Emergency contacts",
         meta: { colWidth: "18%" },
         cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">
               {row.original.emergencyContacts.length}
            </span>
         ),
      },
      {
         id: "actions",
         header: () => <div className="text-right">Actions</div>,
         meta: {
            colWidth: "20%",
            thClassName: "text-right",
            tdClassName: "text-right",
         },
         cell: ({ row }) => (
            <ChildActionsCell child={row.original} onEdit={onEdit} />
         ),
      },
   ];
}