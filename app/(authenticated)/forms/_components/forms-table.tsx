"use client";

import * as React from "react";
import type { FormListItem } from "../queries";
import { FormsDataTable } from "./forms-data-table";
import { FormDialog } from "./form-dialog";

export function FormsTable({ forms }: { forms: FormListItem[] }) {
   const [editing, setEditing] = React.useState<FormListItem | null>(null);

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
         <div className="flex w-full min-w-0 shrink-0 justify-end p-0.5 pb-2">
            <FormDialog mode="add" />
         </div>
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <FormsDataTable forms={forms} onEdit={setEditing} />
         </div>
         <FormDialog
            mode="edit"
            form={editing}
            open={editing !== null}
            onOpenChange={(open) => {
               if (!open) setEditing(null);
            }}
         />
      </div>
   );
}
