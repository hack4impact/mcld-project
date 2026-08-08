"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsersDataTable } from "@/app/(authenticated)/users/_components/users-data-table";
import { CreateChildDialog } from "@/app/(authenticated)/users/_components/children/create-child-dialog";
import { ChildDetailDialog } from "@/app/(authenticated)/users/_components/children/child-detail-dialog";
import type { ChildView } from "@/app/(authenticated)/users/children-queries";
import { formatDate } from "@/lib/format";
import {
   createChild,
   updateChild,
   deleteChild,
} from "@/app/(authenticated)/children/actions";

const GENDER_LABELS: Record<string, string> = {
   male: "Male",
   female: "Female",
   prefer_not_to_say: "Prefer not to say",
};

export function ChildrenClient({ childList }: { childList: ChildView[] }) {
   const router = useRouter();
   const [createOpen, setCreateOpen] = useState(false);
   const [editChild, setEditChild] = useState<ChildView | null>(null);
   const [editOpen, setEditOpen] = useState(false);
   const [deleteTarget, setDeleteTarget] = useState<ChildView | null>(null);
   const [deleting, startDelete] = useTransition();

   function refresh() {
      router.refresh();
   }
   const columns = useMemo<ColumnDef<ChildView>[]>(
      () => [
         {
            id: "profile",
            header: "Child",
            meta: {
               colWidth: "36%",
               tdClassName: "whitespace-normal align-middle",
            },
            cell: ({ row }) => {
               const c = row.original;
               const initials =
                  `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
               return (
                  <div className="flex min-w-0 items-center gap-3">
                     <Avatar>
                        <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                           {initials}
                        </AvatarFallback>
                     </Avatar>
                     <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">
                           {c.firstName} {c.lastName}
                        </span>
                        <span className="truncate text-xs capitalize text-muted-foreground">
                           {GENDER_LABELS[c.gender] ??
                              c.gender.replaceAll("_", " ")}
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
               <span className="text-sm text-muted-foreground">
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
               colWidth: "24%",
               thClassName: "text-right",
               tdClassName: "text-right",
            },
            cell: ({ row }) => {
               const child = row.original;
               return (
                  <div className="flex items-center justify-end gap-0.5">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${child.firstName}`}
                              onClick={() => {
                                 setEditChild(child);
                                 setEditOpen(true);
                              }}
                           >
                              <Pencil />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit child</TooltipContent>
                     </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${child.firstName}`}
                              onClick={() => setDeleteTarget(child)}
                           >
                              <Trash2 />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete child</TooltipContent>
                     </Tooltip>
                  </div>
               );
            },
         },
      ],
      [],
   );

   function handleDelete() {
      if (!deleteTarget) return;
      startDelete(async () => {
         const fd = new FormData();
         fd.set("child_id", deleteTarget.id);
         const result = await deleteChild(null, fd);
         if (result?.errors) {
            toast.error("Failed to delete child", {
               description: Object.values(result.errors).flat().join(" "),
            });
         } else {
            toast.success(result?.message ?? "Child deleted.");
            setDeleteTarget(null);
            refresh();
         }
      });
   }

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
         <CreateChildDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            action={createChild}
            onSuccess={refresh}
         />

         <ChildDetailDialog
            child={editChild}
            open={editOpen}
            onOpenChange={(open) => {
               setEditOpen(open);
               if (!open) setEditChild(null);
            }}
            action={updateChild}
            onSuccess={refresh}
         />

         <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(open) => {
               if (!open) setDeleteTarget(null);
            }}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete child?</AlertDialogTitle>
                  <AlertDialogDescription>
                     This permanently deletes{" "}
                     {deleteTarget
                        ? `${deleteTarget.firstName} ${deleteTarget.lastName}`
                        : "this child"}
                     &rsquo;s profile and emergency contacts. This action cannot
                     be undone.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                     Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                     onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                     }}
                     disabled={deleting}
                  >
                     {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 pb-2">
            <p className="text-sm text-muted-foreground">
               {childList.length} child{childList.length === 1 ? "" : "ren"}
            </p>
            <Button
               type="button"
               className="border-primary bg-clip-border hover:border-primary/80 hover:bg-primary/80 active:translate-y-0"
               onClick={() => setCreateOpen(true)}
            >
               <Plus />
               Add child
            </Button>
         </div>

         <UsersDataTable
            columns={columns}
            data={childList}
            emptyMessage="No children yet. Add one to get started."
            rowLabel={(n) => `${n} child${n === 1 ? "" : "ren"}`}
         />
      </div>
   );
}
