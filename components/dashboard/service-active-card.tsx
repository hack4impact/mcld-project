"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { MoreHorizontal } from "lucide-react";
import { Collapsible } from "radix-ui";
import {
   archiveService,
   setServiceOffered,
   updateService,
   type ServiceActionState,
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
   CardContent,
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
import { ScheduledSlotsField } from "@/components/dashboard/scheduled-slots-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ServiceRow = InferSelectModel<typeof services>;

const controlClass =
   "flex min-h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

type Props = {
   service: ServiceRow;
   priceCadDefault: string;
   priceLabel: string;
};

export function ServiceActiveCard({
   service,
   priceCadDefault,
   priceLabel,
}: Props) {
   const [editOpen, setEditOpen] = useState(false);
   const [editType, setEditType] = useState<
      "coaching_session" | "booking"
   >(service.type);
   const [archiveOpen, setArchiveOpen] = useState(false);
   const [pauseOpen, setPauseOpen] = useState(false);
   const [resumeOpen, setResumeOpen] = useState(false);
   const [savedBanner, setSavedBanner] = useState<string | null>(null);

   const [state, formAction, pending] = useActionState(
      updateService,
      null as ServiceActionState
   );

   useEffect(() => {
      if (!state?.message) return;
      startTransition(() => {
         setSavedBanner(state.message);
         setEditOpen(false);
      });
   }, [state]);

   useEffect(() => {
      if (!savedBanner) return;
      const t = window.setTimeout(() => setSavedBanner(null), 5000);
      return () => window.clearTimeout(t);
   }, [savedBanner]);

   return (
      <Card id={`service-${service.id}`}>
         <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-2">
               <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base">{service.title}</CardTitle>
                  <CardDescription>Stripe: {priceLabel}</CardDescription>
                  <div className="flex flex-wrap gap-1.5">
                     {service.isOffered ? (
                        <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                           Offered
                        </span>
                     ) : (
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                           Not offered
                        </span>
                     )}
                  </div>
                  {savedBanner ? (
                     <p
                        className="text-sm text-green-700 dark:text-green-400"
                        role="status"
                     >
                        {savedBanner}
                     </p>
                  ) : null}
               </div>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0"
                        aria-label="Service actions"
                     >
                        <MoreHorizontal className="size-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem
                        onSelect={() => {
                           setSavedBanner(null);
                           setEditOpen(true);
                        }}
                     >
                        Edit
                     </DropdownMenuItem>
                     {service.isOffered ? (
                        <DropdownMenuItem
                           onSelect={() => setPauseOpen(true)}
                        >
                           Stop offering
                        </DropdownMenuItem>
                     ) : (
                        <DropdownMenuItem
                           onSelect={() => setResumeOpen(true)}
                        >
                           Offer again
                        </DropdownMenuItem>
                     )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setArchiveOpen(true)}
                     >
                        Archive
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </CardHeader>

         <Collapsible.Root
            open={editOpen}
            onOpenChange={(open) => {
               setEditOpen(open);
               if (open) setSavedBanner(null);
            }}
         >
            <Collapsible.Content className="overflow-hidden">
               <CardContent className="space-y-4 pt-0">
                  <form action={formAction} className="space-y-4">
                     <input type="hidden" name="service_id" value={service.id} />

                     {state?.errors?._form?.[0] ? (
                        <p className="text-destructive text-sm" role="alert">
                           {state.errors._form[0]}
                        </p>
                     ) : null}

                     <div className="space-y-2">
                        <Label htmlFor={`title-${service.id}`}>Title</Label>
                        <Input
                           id={`title-${service.id}`}
                           name="title"
                           defaultValue={service.title}
                           required
                        />
                        {state?.errors?.title?.[0] ? (
                           <p className="text-destructive text-xs">
                              {state.errors.title[0]}
                           </p>
                        ) : null}
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor={`desc-${service.id}`}>
                           Description
                        </Label>
                        <textarea
                           id={`desc-${service.id}`}
                           name="description"
                           rows={3}
                           defaultValue={service.description ?? ""}
                           className={cn(controlClass, "min-h-[72px] resize-y")}
                        />
                     </div>

                     <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                           <Label htmlFor={`type-${service.id}`}>Type</Label>
                           <select
                              id={`type-${service.id}`}
                              name="type"
                              required
                              value={editType}
                              onChange={(e) =>
                                 setEditType(
                                    e.target.value as
                                       | "coaching_session"
                                       | "booking"
                                 )
                              }
                              className={controlClass}
                           >
                              <option value="coaching_session">
                                 Coaching session
                              </option>
                              <option value="booking">Booking</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor={`dur-${service.id}`}>
                              Duration (minutes)
                           </Label>
                           <Input
                              id={`dur-${service.id}`}
                              name="duration_minutes"
                              type="number"
                              min={1}
                              defaultValue={service.durationMinutes}
                              required
                           />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                           <Label htmlFor={`price-${service.id}`}>
                              Price (CAD)
                           </Label>
                           <Input
                              id={`price-${service.id}`}
                              name="price_cad"
                              inputMode="decimal"
                              defaultValue={priceCadDefault}
                              required
                           />
                           {state?.errors?.price_cad?.[0] ? (
                              <p className="text-destructive text-xs">
                                 {state.errors.price_cad[0]}
                              </p>
                           ) : null}
                        </div>
                        <ScheduledSlotsField
                           idPrefix={`edit-${service.id}`}
                           initialValue={service.scheduledAt}
                           active={editType === "booking"}
                        />
                        {state?.errors?.scheduled_at?.[0] ? (
                           <p className="text-destructive col-span-full text-xs">
                              {state.errors.scheduled_at[0]}
                           </p>
                        ) : null}
                     </div>

                     <Button type="submit" size="sm" disabled={pending}>
                        {pending ? "Saving…" : "Save changes"}
                     </Button>
                  </form>
               </CardContent>
            </Collapsible.Content>
         </Collapsible.Root>

         <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <AlertDialogContent>
               <form action={archiveService}>
                  <input
                     type="hidden"
                     name="service_id"
                     value={service.id}
                  />
                  <AlertDialogHeader>
                     <AlertDialogTitle>Archive this service?</AlertDialogTitle>
                     <AlertDialogDescription>
                        It will move to Archived. Clients won&apos;t see it in
                        the active catalog. You can unarchive it later.
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                     <AlertDialogAction type="submit">Archive</AlertDialogAction>
                  </AlertDialogFooter>
               </form>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={pauseOpen} onOpenChange={setPauseOpen}>
            <AlertDialogContent>
               <form action={setServiceOffered}>
                  <input
                     type="hidden"
                     name="service_id"
                     value={service.id}
                  />
                  <input type="hidden" name="offered" value="false" />
                  <AlertDialogHeader>
                     <AlertDialogTitle>Stop offering?</AlertDialogTitle>
                     <AlertDialogDescription>
                        The Stripe product will be deactivated. You can offer it
                        again anytime.
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                     <AlertDialogAction type="submit">
                        Stop offering
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </form>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={resumeOpen} onOpenChange={setResumeOpen}>
            <AlertDialogContent>
               <form action={setServiceOffered}>
                  <input
                     type="hidden"
                     name="service_id"
                     value={service.id}
                  />
                  <input type="hidden" name="offered" value="true" />
                  <AlertDialogHeader>
                     <AlertDialogTitle>Offer this service again?</AlertDialogTitle>
                     <AlertDialogDescription>
                        The Stripe product will be activated for purchase.
                     </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                     <AlertDialogAction type="submit">
                        Offer again
                     </AlertDialogAction>
                  </AlertDialogFooter>
               </form>
            </AlertDialogContent>
         </AlertDialog>
      </Card>
   );
}
