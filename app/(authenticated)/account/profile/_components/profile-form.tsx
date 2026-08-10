"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { updateMyProfile, type ProfileActionState } from "../actions";

const GENDER_OPTIONS = [
   { value: "male", label: "Male" },
   { value: "female", label: "Female" },
   { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export type ProfileFormValues = {
   firstName: string;
   lastName: string;
   phone: string | null;
   address: string | null;
   dob: string | null;
   gender: string | null;
};

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function ProfileForm({ profile }: { profile: ProfileFormValues }) {
   const [state, formAction, pending] = useActionState<
      ProfileActionState,
      FormData
   >(updateMyProfile, null);

   const lastStateRef = useRef(state);

   useEffect(() => {
      if (state === lastStateRef.current) return;
      lastStateRef.current = state;

      if (state?.message) toast.success(state.message);
      if (state?.errors?._form) toast.error(state.errors._form[0]);
   }, [state]);

   return (
      <form action={formAction} className="space-y-4">
         <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
               <Label htmlFor="first_name">First name</Label>
               <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={profile.firstName}
                  required
               />
               <FieldError errors={state?.errors?.first_name} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="last_name">Last name</Label>
               <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={profile.lastName}
                  required
               />
               <FieldError errors={state?.errors?.last_name} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="phone">Phone</Label>
               <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone ?? ""}
               />
               <FieldError errors={state?.errors?.phone} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="dob">Date of birth</Label>
               <Input
                  id="dob"
                  name="dob"
                  type="date"
                  defaultValue={profile.dob ?? ""}
               />
               <FieldError errors={state?.errors?.dob} />
            </div>

            <div className="space-y-2">
               <Label htmlFor="gender">Gender</Label>
               <Select name="gender" defaultValue={profile.gender ?? undefined}>
                  <SelectTrigger id="gender" className="w-full">
                     <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                     {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                           {option.label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
               <FieldError errors={state?.errors?.gender} />
            </div>

            <div className="space-y-2 sm:col-span-2">
               <Label htmlFor="address">Address</Label>
               <Input
                  id="address"
                  name="address"
                  defaultValue={profile.address ?? ""}
               />
               <FieldError errors={state?.errors?.address} />
            </div>
         </div>

         <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
               {pending ? <Spinner className="size-4" /> : null}
               Save changes
            </Button>
            <FieldError errors={state?.errors?._form} />
         </div>
      </form>
   );
}
