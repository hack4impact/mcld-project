"use client";

import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import type { KidRegistration } from "../queries";
import { GENDER_LABELS } from "./constants";

function Row({ label, value }: { label: string; value: string }) {
   return (
      <div className="flex items-start justify-between gap-4 text-sm">
         <span className="shrink-0 text-muted-foreground">{label}</span>
         <span className="text-right">{value}</span>
      </div>
   );
}

export function ChildInfoModal({
   registration,
   open,
   onOpenChange,
}: {
   registration: KidRegistration | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}) {
   if (!registration) return null;
   const { child, formAnswers } = registration;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
               <DialogTitle>
                  {child.firstName} {child.lastName}
               </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
               <div className="space-y-2">
                  <Row label="Date of birth" value={formatDate(child.dob)} />
                  <Row
                     label="Gender"
                     value={GENDER_LABELS[child.gender] ?? child.gender}
                  />
                  {child.allergies && (
                     <Row label="Allergies" value={child.allergies} />
                  )}
                  {child.medicalConditions && (
                     <Row label="Medical conditions" value={child.medicalConditions} />
                  )}
                  {child.medications && (
                     <Row label="Medications" value={child.medications} />
                  )}
               </div>

               {child.emergencyContacts.length > 0 && (
                  <>
                     <Separator />
                     <div className="space-y-3">
                        <p className="text-sm font-medium">Emergency contacts</p>
                        {child.emergencyContacts.map((ec, i) => (
                           <div
                              key={i}
                              className={i > 0 ? "border-t border-border pt-3" : ""}
                           >
                              <p className="mb-1 text-sm font-medium">
                                 {ec.fullName}{" "}
                                 <span className="font-normal text-muted-foreground">
                                    · {ec.relationship}
                                 </span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                 {ec.emailAddress}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                 {ec.phoneNumber}
                              </p>
                           </div>
                        ))}
                     </div>
                  </>
               )}

               {formAnswers.length > 0 && (
                  <>
                     <Separator />
                     <div className="space-y-3">
                        <p className="text-sm font-medium">Form answers</p>
                        {formAnswers.map((qa, i) => (
                           <div key={i}>
                              <p className="text-sm text-muted-foreground">{qa.prompt}</p>
                              <p className="mt-0.5 text-sm">{qa.answer.join(", ")}</p>
                           </div>
                        ))}
                     </div>
                  </>
               )}
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
