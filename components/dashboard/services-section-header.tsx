"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AddServiceForm } from "@/components/dashboard/add-service-form";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";

type Props = {
   showArchived: boolean;
};

export function ServicesSectionHeader({ showArchived }: Props) {
   const [addOpen, setAddOpen] = useState(false);
   const [formKey, setFormKey] = useState(0);
   const closeAddDialog = useCallback(() => setAddOpen(false), []);

   return (
      <div className="space-y-4">
         <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
               <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
               <p className="text-muted-foreground text-sm">
                  Catalog and Stripe (CAD). Prices come from Stripe.
               </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
               {!showArchived ? (
                  <>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                           setFormKey((k) => k + 1);
                           setAddOpen(true);
                        }}
                     >
                        Add service
                     </Button>
                     <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogContent className="sm:max-w-2xl">
                           <DialogHeader>
                              <DialogTitle>New service</DialogTitle>
                              <DialogDescription>
                                 Creates a Stripe product with a one-time CAD
                                 price and a database row.
                              </DialogDescription>
                           </DialogHeader>
                           <AddServiceForm
                              key={formKey}
                              onCreated={closeAddDialog}
                           />
                        </DialogContent>
                     </Dialog>
                  </>
               ) : null}
               <div className="bg-muted/60 flex rounded-lg p-0.5">
                  <Button
                     variant={!showArchived ? "secondary" : "ghost"}
                     size="sm"
                     className="rounded-md shadow-none"
                     asChild
                  >
                     <Link href="/dashboard/services">Current</Link>
                  </Button>
                  <Button
                     variant={showArchived ? "secondary" : "ghost"}
                     size="sm"
                     className="rounded-md shadow-none"
                     asChild
                  >
                     <Link href="/dashboard/services?view=archived">
                        Archived
                     </Link>
                  </Button>
               </div>
            </div>
         </div>
      </div>
   );
}
