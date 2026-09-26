"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DraftEmergencyContact = {
   id: string;
   full_name: string;
   email_address: string;
   phone_number: string;
   relationship: string;
};

type EmergencyContactDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   contact?: DraftEmergencyContact | null;
   onSave: (contact: Omit<DraftEmergencyContact, "id">) => void;
};

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function EmergencyContactDialog({
   open,
   onOpenChange,
   contact = null,
   onSave,
}: EmergencyContactDialogProps) {
   const [formKey, setFormKey] = useState(0);
   const [errors, setErrors] = useState<Record<string, string[]>>({});
   const isEditing = !!contact;

   function handleOpenChange(nextOpen: boolean) {
      if (nextOpen) {
         setFormKey((k) => k + 1);
         setErrors({});
      }
      onOpenChange(nextOpen);
   }

   function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      e.stopPropagation();

      const data = new FormData(e.currentTarget);
      const full_name = String(data.get("full_name") ?? "").trim();
      const email_address = String(data.get("email_address") ?? "").trim();
      const phone_number = String(data.get("phone_number") ?? "").replace(
         /\D/g,
         "",
      );
      const relationship = String(data.get("relationship") ?? "").trim();

      const nextErrors: Record<string, string[]> = {};
      if (!full_name) nextErrors.full_name = ["Full name is required"];
      if (!email_address) nextErrors.email_address = ["Email is required"];
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_address)) {
         nextErrors.email_address = ["Invalid email address"];
      }
      if (!phone_number) nextErrors.phone_number = ["Phone number is required"];
      else if (!/^\d{10,15}$/.test(phone_number)) {
         nextErrors.phone_number = ["Phone number must be 10–15 digits"];
      }
      if (!relationship) nextErrors.relationship = ["Relationship is required"];

      if (Object.keys(nextErrors).length > 0) {
         setErrors(nextErrors);
         return;
      }

      onSave({ full_name, email_address, phone_number, relationship });
      handleOpenChange(false);
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>
                  {isEditing
                     ? "Edit emergency contact"
                     : "Add emergency contact"}
               </DialogTitle>
               <DialogDescription>
                  Required for every child profile.
               </DialogDescription>
            </DialogHeader>

            <form
               key={formKey}
               onSubmit={handleSubmit}
               className="flex flex-col gap-4"
            >
               <div className="space-y-2">
                  <Label htmlFor="ec_dialog_name">Full name</Label>
                  <Input
                     id="ec_dialog_name"
                     name="full_name"
                     defaultValue={contact?.full_name ?? ""}
                     required
                  />
                  <FieldError errors={errors.full_name} />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="ec_dialog_email">Email</Label>
                  <Input
                     id="ec_dialog_email"
                     name="email_address"
                     type="email"
                     defaultValue={contact?.email_address ?? ""}
                     required
                  />
                  <FieldError errors={errors.email_address} />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="ec_dialog_phone">Phone</Label>
                  <Input
                     id="ec_dialog_phone"
                     name="phone_number"
                     type="tel"
                     inputMode="numeric"
                     defaultValue={contact?.phone_number ?? ""}
                     onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, "");
                     }}
                     required
                  />
                  <FieldError errors={errors.phone_number} />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="ec_dialog_relationship">Relationship</Label>
                  <Input
                     id="ec_dialog_relationship"
                     name="relationship"
                     defaultValue={contact?.relationship ?? ""}
                     required
                  />
                  <FieldError errors={errors.relationship} />
               </div>

               <DialogFooter>
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => handleOpenChange(false)}
                  >
                     Cancel
                  </Button>
                  <Button type="submit">
                     {isEditing ? (
                        "Save contact"
                     ) : (
                        <>
                           <Plus />
                           Add contact
                        </>
                     )}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}
