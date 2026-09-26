"use client";

import * as React from "react";

import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

import { fetchServiceRegistrations } from "./actions";
import type { ServiceRegistration, ServiceView } from "./queries";

export function RegistrationsDialog({
   service,
   open,
   onOpenChange,
}: {
   service: ServiceView | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   const [registrations, setRegistrations] = React.useState<
      ServiceRegistration[] | null
   >(null);
   const [error, setError] = React.useState<string | null>(null);
   const [pending, startTransition] = React.useTransition();

   React.useEffect(() => {
      if (!open || !service) return;
      setRegistrations(null);
      setError(null);
      startTransition(async () => {
         try {
            const rows = await fetchServiceRegistrations(service.id);
            setRegistrations(rows);
         } catch {
            setError("Could not load registrations.");
         }
      });
   }, [open, service]);

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Registered people</DialogTitle>
               <DialogDescription>
                  {service?.title ?? "Service"} — registrations and form answers
               </DialogDescription>
            </DialogHeader>

            {pending && (
               <div className="flex justify-center py-8">
                  <Spinner className="size-6 text-muted-foreground" />
               </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!pending && !error && registrations && (
               <ScrollArea className="max-h-[60vh] pr-3">
                  {registrations.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        No one has registered for this service yet.
                     </p>
                  ) : (
                     <ul className="flex flex-col gap-4">
                        {registrations.map((r) => (
                           <li
                              key={r.bookingId}
                              className="rounded-md border border-border p-3"
                           >
                              <div className="flex items-center justify-between gap-2">
                                 <span className="font-medium">
                                    {r.registrantName || "—"}
                                 </span>
                                 <span className="text-xs capitalize text-muted-foreground">
                                    {r.status}
                                 </span>
                              </div>
                              {r.answers.length > 0 ? (
                                 <dl className="mt-2 flex flex-col gap-1.5">
                                    {r.answers.map((a, i) => (
                                       <div key={i} className="text-sm">
                                          <dt className="text-muted-foreground">
                                             {a.prompt}
                                          </dt>
                                          <dd>{a.answer.join(", ") || "—"}</dd>
                                       </div>
                                    ))}
                                 </dl>
                              ) : (
                                 <p className="mt-1 text-xs text-muted-foreground">
                                    No form answers.
                                 </p>
                              )}
                           </li>
                        ))}
                     </ul>
                  )}
               </ScrollArea>
            )}
         </DialogContent>
      </Dialog>
   );
}
