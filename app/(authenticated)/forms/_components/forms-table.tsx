"use client";

import * as React from "react";
import type { FormListItem } from "../queries";
import { FormsDataTable } from "./forms-data-table";
import { FormDialog } from "./form-dialog";

export function FormsTable({ forms }: { forms: FormListItem[] }) {
  const [editing, setEditing] = React.useState<FormListItem | null>(null);

  return (
    <>
      <div className="flex justify-end">
        <FormDialog mode="add" />
      </div>
      <FormsDataTable forms={forms} onEdit={setEditing} />
      <FormDialog
        mode="edit"
        form={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </>
  );
}