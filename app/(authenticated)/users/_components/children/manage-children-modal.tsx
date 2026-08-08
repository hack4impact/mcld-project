"use client";

import { useCallback, useEffect, useState } from "react";
import { Baby, Pencil, Plus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/format";
import { listChildrenForUserAdmin } from "@/app/(authenticated)/users/children-actions";
import type { ChildView } from "@/app/(authenticated)/users/children-queries";

import { ChildDetailDialog } from "./child-detail-dialog";
import { CreateChildDialog } from "./create-child-dialog";

const GENDER_LABELS: Record<string, string> = {
   male: "Male",
   female: "Female",
   prefer_not_to_say: "Prefer not to say",
};

export function ManageChildrenModal({
   parentId,
   userName,
   open,
   onOpenChange,
}: {
   parentId: string;
   userName: string;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const [children, setChildren] = useState<ChildView[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [createOpen, setCreateOpen] = useState(false);
   const [editChild, setEditChild] = useState<ChildView | null>(null);
   const [editOpen, setEditOpen] = useState(false);

   const refresh = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const result = await listChildrenForUserAdmin(parentId);
         if ("error" in result) {
            setError(result.error);
            setChildren([]);
         } else {
            setChildren(result);
         }
      } finally {
         setLoading(false);
      }
   }, [parentId]);

   useEffect(() => {
      if (open) {
         void refresh();
      } else {
         setCreateOpen(false);
         setEditOpen(false);
         setEditChild(null);
         setError(null);
      }
   }, [open, refresh]);

   function handleEdit(child: ChildView) {
      setEditChild(child);
      setEditOpen(true);
   }

   return (
      <>
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
               <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
                  <DialogTitle className="flex items-center gap-2">
                     <Baby className="size-4" />
                     Children
                  </DialogTitle>
                  <DialogDescription>
                     Manage children for {userName}.
                  </DialogDescription>
               </DialogHeader>

               <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
                  <div className="flex items-center justify-between gap-2">
                     <p className="text-sm text-muted-foreground">
                        {loading
                           ? "Loading…"
                           : `${children.length} child${children.length === 1 ? "" : "ren"}`}
                     </p>
                     <Button
                        type="button"
                        size="sm"
                        disabled={loading}
                        onClick={() => setCreateOpen(true)}
                     >
                        <Plus />
                        Add child
                     </Button>
                  </div>

                  {loading ? (
                     <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                        <Spinner className="size-6" />
                        <p className="text-xs">Loading children…</p>
                     </div>
                  ) : error ? (
                     <div className="flex items-center justify-center py-10 text-xs font-semibold text-destructive">
                        {error}
                     </div>
                  ) : children.length === 0 ? (
                     <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                        No children yet. Add one to get started.
                     </div>
                  ) : (
                     <ul className="space-y-2">
                        {children.map((child) => {
                           const initials =
                              `${child.firstName[0] ?? ""}${child.lastName[0] ?? ""}`.toUpperCase();
                           return (
                              <li
                                 key={child.id}
                                 className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                              >
                                 <div className="flex min-w-0 items-center gap-3">
                                    <Avatar>
                                       <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                                          {initials}
                                       </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                       <p className="truncate text-sm font-medium">
                                          {child.firstName} {child.lastName}
                                       </p>
                                       <p className="truncate text-xs text-muted-foreground">
                                          {formatDate(child.dob)} ·{" "}
                                          {GENDER_LABELS[child.gender] ??
                                             child.gender}
                                          {" · "}
                                          {child.emergencyContacts.length}{" "}
                                          emergency contact
                                          {child.emergencyContacts.length === 1
                                             ? ""
                                             : "s"}
                                       </p>
                                    </div>
                                 </div>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Edit ${child.firstName}`}
                                    onClick={() => handleEdit(child)}
                                 >
                                    <Pencil className="size-4" />
                                 </Button>
                              </li>
                           );
                        })}
                     </ul>
                  )}
               </div>
            </DialogContent>
         </Dialog>

         <CreateChildDialog
            parentId={parentId}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={refresh}
         />

         <ChildDetailDialog
            child={editChild}
            parentId={parentId}
            open={editOpen}
            onOpenChange={(next) => {
               setEditOpen(next);
               if (!next) setEditChild(null);
            }}
            onSuccess={refresh}
         />
      </>
   );
}
