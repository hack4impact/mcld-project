"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { UsersDataTable } from "@/app/(authenticated)/users/_components/users-data-table";
import { FormActionsCell } from "@/app/(authenticated)/forms/_components/form-actions-cell";
import type { FormListItem } from "../queries";

export function FormsDataTable({
   forms,
   onEdit,
}: {
   forms: FormListItem[];
   onEdit: (form: FormListItem) => void;
}) {
   const columns = React.useMemo<ColumnDef<FormListItem>[]>(
      () => [
         {
            accessorKey: "name",
            header: "Name",
            meta: { colWidth: "40%" },
            cell: ({ row }) => (
               <span className="block min-w-0 truncate font-medium">
                  {row.original.name}
               </span>
            ),
         },
         {
            accessorKey: "questionCount",
            header: "Questions",
            meta: { colWidth: "18%" },
         },
         {
            accessorKey: "attachedServiceCount",
            header: "Used by",
            meta: { colWidth: "20%" },
            cell: ({ row }) => {
               const n = row.original.attachedServiceCount;
               return `${n} service${n === 1 ? "" : "s"}`;
            },
         },
         {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            meta: {
               colWidth: "22%",
               thClassName: "text-right",
               tdClassName: "text-right",
            },
            cell: ({ row }) => (
               <FormActionsCell form={row.original} onEdit={onEdit} />
            ),
         },
      ],
      [onEdit],
   );

   return (
      <UsersDataTable
         columns={columns}
         data={forms}
         emptyMessage="No forms yet. Create one to get started."
         rowLabel={(n) => `${n} form${n === 1 ? "" : "s"}`}
      />
   );
}
