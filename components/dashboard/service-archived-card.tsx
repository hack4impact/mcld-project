"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { MoreHorizontal } from "lucide-react";
import {
   deleteService,
   unarchiveService,
} from "@/app/dashboard/services/actions";
import type { services } from "@/lib/db/schema";
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
   Card,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ServiceRow = InferSelectModel<typeof services>;

type Props = {
   service: ServiceRow;
   priceLabel: string;
};

export function ServiceArchivedCard({ service, priceLabel }: Props) {
   const [unarchiveOpen, setUnarchiveOpen] = useState(false);
   const [deleteOpen, setDeleteOpen] = useState(false);

   return (
      <Card className="border-muted-foreground/25">
         <CardHeader>
            <div className="flex items-start justify-between gap-2">
               <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base">{service.title}</CardTitle>
                  <CardDescription>Stripe: {priceLabel}</CardDescription>
                  <span className="bg-muted text-muted-foreground inline-flex rounded-md px-2 py-0.5 text-xs font-medium">
                     Archived
                  </span>
               </div>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label="Archived service actions"
                     >
                        <MoreHorizontal className="size-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onSelect={() => setUnarchiveOpen(true)}>
                        Unarchive
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleteOpen(true)}
                     >
                        Delete
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </CardHeader>

         <AlertDialog open={unarchiveOpen} onOpenChange={setUnarchiveOpen}>
            <AlertDialogContent>
               <form action={unarchiveService}>
                  <input
                     type="hidden"
                     name="service_id"
                     value={service.id}
                  />
                  <AlertDialogHeader>
                     <AlertDialogTitle>Unarchive this service?</AlertDialogTitle>
                     <AlertDialogDescription>
                        It will return to your active catalog. Offering state
                        stays as you left it.
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                     <AlertDialogAction type="submit">
                        Unarchive
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </form>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
               <form action={deleteService}>
                  <input
                     type="hidden"
                     name="service_id"
                     value={service.id}
                  />
                  <AlertDialogHeader>
                     <AlertDialogTitle>Delete this service?</AlertDialogTitle>
                     <AlertDialogDescription>
                        It will be marked deleted and hidden from lists. Stripe
                        will be deactivated.
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                     <AlertDialogAction
                        type="submit"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     >
                        Delete
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </form>
            </AlertDialogContent>
         </AlertDialog>
      </Card>
   );
}
