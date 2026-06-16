"use client";

import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";
import type { KidRegistration } from "../queries";

const GENDER_LABELS: Record<string, string> = {
   male: "Male",
   female: "Female",
   prefer_not_to_say: "Prefer not to say",
};

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
         <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>
                  {child.firstName} {child.lastName}
               </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-5">
               {/* Profile */}
               <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                     Profile
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                     <dt className="text-muted-foreground">Date of birth</dt>
                     <dd>{formatDate(child.dob)}</dd>
                     <dt className="text-muted-foreground">Gender</dt>
                     <dd>{GENDER_LABELS[child.gender] ?? child.gender}</dd>
                     {child.allergies && (
                        <>
                           <dt className="text-muted-foreground">Allergies</dt>
                           <dd>{child.allergies}</dd>
                        </>
                     )}
                     {child.medicalConditions && (
                        <>
                           <dt className="text-muted-foreground">Medical conditions</dt>
                           <dd>{child.medicalConditions}</dd>
                        </>
                     )}
                     {child.medications && (
                        <>
                           <dt className="text-muted-foreground">Medications</dt>
                           <dd>{child.medications}</dd>
                        </>
                     )}
                  </dl>
               </section>

               {/* Emergency contacts */}
               {child.emergencyContacts.length > 0 && (
                  <>
                     <Separator />
                     <section className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                           Emergency Contacts
                        </h3>
                        <ul className="flex flex-col gap-3">
                           {child.emergencyContacts.map((ec, i) => (
                              <li key={i} className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                 <span className="text-muted-foreground">Name</span>
                                 <span>{ec.fullName}</span>
                                 <span className="text-muted-foreground">Relationship</span>
                                 <span className="capitalize">{ec.relationship}</span>
                                 <span className="text-muted-foreground">Email</span>
                                 <span>{ec.emailAddress}</span>
                                 <span className="text-muted-foreground">Phone</span>
                                 <span>{ec.phoneNumber}</span>
                              </li>
                           ))}
                        </ul>
                     </section>
                  </>
               )}

               {/* Form answers */}
               {formAnswers.length > 0 && (
                  <>
                     <Separator />
                     <section className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                           Form Answers
                        </h3>
                        <ul className="flex flex-col gap-3">
                           {formAnswers.map((qa, i) => (
                              <li key={i} className="flex flex-col gap-0.5 text-sm">
                                 <span className="font-medium">{qa.prompt}</span>
                                 <span className="text-muted-foreground">
                                    {qa.answer.join(", ")}
                                 </span>
                              </li>
                           ))}
                        </ul>
                     </section>
                  </>
               )}
            </div>
         </DialogContent>
      </Dialog>
   );
}
