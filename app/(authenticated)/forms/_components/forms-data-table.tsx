"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import type { FormListItem } from "../queries";
import { FormActionsCell } from "./form-actions-cell";

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
            cell: ({ row }) => (
               <span className="font-medium">{row.original.name}</span>
            ),
         },
         {
            accessorKey: "questionCount",
            header: "Questions",
         },
         {
            accessorKey: "attachedServiceCount",
            header: "Used by",
            cell: ({ row }) => {
               const n = row.original.attachedServiceCount;
               return `${n} service${n === 1 ? "" : "s"}`;
            },
         },
         {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
               <FormActionsCell form={row.original} onEdit={onEdit} />
            ),
         },
      ],
      [onEdit],
   );

   return (
      <DataTable
         columns={columns}
         data={forms}
         emptyMessage="No forms yet. Create one to get started."
         rowLabel={(n) => `${n} form${n === 1 ? "" : "s"}`}
      />
   );
}
