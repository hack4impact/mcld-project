"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteForm } from "../actions";
import type { FormListItem } from "../queries";

export function FormActionsCell({
   form,
   onEdit,
}: {
   form: FormListItem;
   onEdit: (form: FormListItem) => void;
}) {
   const [deleteOpen, setDeleteOpen] = React.useState(false);
   const [pending, startTransition] = React.useTransition();

   const handleDelete = () => {
      const fd = new FormData();
      fd.set("form_id", form.id);
      startTransition(async () => {
         const result = await deleteForm(null, fd);
         if (result?.errors?._form) {
            toast.error("Could not delete form", {
               description: result.errors._form.join(" "),
            });
            return;
         }
         if (result?.message) {
            toast.success(result.message);
            setDeleteOpen(false);
         }
      });
   };

   return (
      <>
         <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     aria-label="Edit form"
                     onClick={() => onEdit(form)}
                  >
                     <Pencil />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     aria-label="Delete form"
                     onClick={() => setDeleteOpen(true)}
                  >
                     <Trash2 />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>Delete</TooltipContent>
            </Tooltip>
         </div>

         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent className="sm:max-w-md">
               <AlertDialogHeader className="place-items-start text-left sm:place-items-start sm:text-left">
                  <AlertDialogTitle>Delete form?</AlertDialogTitle>
                  <AlertDialogDescription>
                     {form.attachedServiceCount > 0
                        ? `This form is attached to ${form.attachedServiceCount} service(s). Detach it from those services before deleting.`
                        : `Permanently delete "${form.name}" and all of its questions. This cannot be undone.`}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter className="sm:flex-row sm:justify-end">
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     disabled={pending || form.attachedServiceCount > 0}
                     onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                     }}
                  >
                     {pending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
