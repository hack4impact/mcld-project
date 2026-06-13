"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { createChild, type ChildActionState } from "../actions";
import { DobField } from "./dob-field";
import {
   EmergencyContactDialog,
   type DraftEmergencyContact,
} from "./emergency-contact-dialog";

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function CreateChildDialog() {
   const [open, setOpen] = useState(false);
   const [formKey, setFormKey] = useState(0);
   const [gender, setGender] = useState("");
   const [dob, setDob] = useState("");
   const [emergencyContacts, setEmergencyContacts] = useState<
      DraftEmergencyContact[]
   >([]);
   const [ecSectionOpen, setEcSectionOpen] = useState(true);
   const [addContactOpen, setAddContactOpen] = useState(false);

   const boundFormAction = useCallback(
      (prev: ChildActionState, formData: FormData) => {
         if (emergencyContacts.length === 0) {
            return {
               errors: {
                  emergency_contacts: [
                     "Add at least one emergency contact",
                  ],
               },
            };
         }
         formData.set(
            "emergency_contacts",
            JSON.stringify(
               emergencyContacts.map(({ id: _id, ...contact }) => contact),
            ),
         );
         return createChild(prev, formData);
      },
      [emergencyContacts],
   );

   const [state, formAction, pending] = useActionState(
      boundFormAction,
      null,
   );

   useEffect(() => {
      if (!state?.message) return;
      setOpen(false);
      setGender("");
      setDob("");
      setEmergencyContacts([]);
      setEcSectionOpen(true);
      setFormKey((k) => k + 1);
   }, [state?.message]);

   function handleAddContact(
      contact: Omit<DraftEmergencyContact, "id">,
   ) {
      setEmergencyContacts((prev) => [
         ...prev,
         { ...contact, id: crypto.randomUUID() },
      ]);
      setEcSectionOpen(true);
   }

   function handleRemoveContact(id: string) {
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
   }

   return (
      <>
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
               <Button className="border-primary bg-clip-border hover:border-primary/80 hover:bg-primary/80 active:translate-y-0">
                  <Plus />
                  Add child
               </Button>
            </DialogTrigger>

            {open && (
               <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
                  <DialogHeader className="shrink-0 border-b px-6 py-4">
                     <DialogTitle>Add child</DialogTitle>
                  </DialogHeader>

                  <form
                     key={formKey}
                     action={formAction}
                     className="flex min-h-0 flex-1 flex-col"
                  >
                     <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                        {state?.errors?._form?.map((msg) => (
                           <p key={msg} className="text-sm text-destructive">
                              {msg}
                           </p>
                        ))}

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label htmlFor="first_name">First name</Label>
                              <Input
                                 id="first_name"
                                 name="first_name"
                                 required
                              />
                              <FieldError errors={state?.errors?.first_name} />
                           </div>
                           <div className="space-y-2">
                              <Label htmlFor="last_name">Last name</Label>
                              <Input id="last_name" name="last_name" required />
                              <FieldError errors={state?.errors?.last_name} />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label htmlFor="dob">Date of birth</Label>
                              <DobField value={dob} onChange={setDob} />
                              <FieldError errors={state?.errors?.dob} />
                           </div>
                           <div className="space-y-2">
                              <Label htmlFor="gender">Gender</Label>
                              <Select value={gender} onValueChange={setGender}>
                                 <SelectTrigger id="gender" className="w-full">
                                    <SelectValue placeholder="Select gender" />
                                 </SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="prefer_not_to_say">
                                       Prefer not to say
                                    </SelectItem>
                                 </SelectContent>
                              </Select>
                              <input
                                 type="hidden"
                                 name="gender"
                                 value={gender}
                              />
                              <FieldError errors={state?.errors?.gender} />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label htmlFor="allergies">Allergies</Label>
                              <Textarea
                                 id="allergies"
                                 name="allergies"
                                 rows={3}
                                 className="resize-none"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label htmlFor="medical_conditions">
                                 Medical conditions
                              </Label>
                              <Textarea
                                 id="medical_conditions"
                                 name="medical_conditions"
                                 rows={3}
                                 className="resize-none"
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label htmlFor="medications">Medications</Label>
                           <Textarea
                              id="medications"
                              name="medications"
                              rows={3}
                              className="resize-none"
                           />
                        </div>

                        <Card className="py-0">
                           <button
                              type="button"
                              className="flex w-full items-center justify-between px-4 py-3 text-left"
                              onClick={() => setEcSectionOpen((o) => !o)}
                           >
                              <span className="text-sm font-medium">
                                 Emergency contacts ({emergencyContacts.length})
                              </span>
                              <ChevronDown
                                 className={cn(
                                    "size-4 shrink-0 text-muted-foreground transition-transform",
                                    ecSectionOpen && "rotate-180",
                                 )}
                              />
                           </button>

                           {ecSectionOpen && (
                              <CardContent className="space-y-3 border-t pt-3 pb-4">
                                 {emergencyContacts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                       No emergency contacts yet.
                                    </p>
                                 ) : (
                                    <ul className="space-y-2">
                                       {emergencyContacts.map((contact) => (
                                          <li
                                             key={contact.id}
                                             className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                                          >
                                             <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                   {contact.full_name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                   {contact.relationship} ·{" "}
                                                   {contact.phone_number}
                                                </p>
                                             </div>
                                             <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label={`Remove ${contact.full_name}`}
                                                onClick={() =>
                                                   handleRemoveContact(
                                                      contact.id,
                                                   )
                                                }
                                             >
                                                <Trash2 className="size-4" />
                                             </Button>
                                          </li>
                                       ))}
                                    </ul>
                                 )}

                                 <FieldError
                                    errors={state?.errors?.emergency_contacts}
                                 />

                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddContactOpen(true)}
                                 >
                                    <Plus />
                                    Add contact
                                 </Button>
                              </CardContent>
                           )}
                        </Card>
                     </div>

                     <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 gap-2 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row ">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? "Saving…" : "Create child"}
                        </Button>
                    </DialogFooter>
                  </form>
               </DialogContent>
            )}
         </Dialog>

         <EmergencyContactDialog
            open={addContactOpen}
            onOpenChange={setAddContactOpen}
            onAdd={handleAddContact}
         />
      </>
   );
}