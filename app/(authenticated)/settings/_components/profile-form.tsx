"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { DobField } from "@/app/(authenticated)/users/_components/children/dob-field";
import {
   updateOwnProfile,
   type SettingsActionState,
} from "@/app/(authenticated)/settings/actions";

const GENDER_UNSET = "unset";

export type OwnProfile = {
   firstName: string;
   lastName: string;
   phone: string | null;
   address: string | null;
   gender: string | null;
   dob: string | null;
};

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function ProfileForm({ profile }: { profile: OwnProfile }) {
   const [state, formAction, pending] = useActionState<
      SettingsActionState,
      FormData
   >(updateOwnProfile, null);

   const [firstName, setFirstName] = useState(profile.firstName);
   const [lastName, setLastName] = useState(profile.lastName);
   const [phone, setPhone] = useState(profile.phone ?? "");
   const [address, setAddress] = useState(profile.address ?? "");
   const [gender, setGender] = useState(profile.gender ?? GENDER_UNSET);
   const [dob, setDob] = useState(profile.dob ?? "");

   const handled = useRef<SettingsActionState>(null);
   useEffect(() => {
      if (!state || state === handled.current) return;
      handled.current = state;
      if (state.message) toast.success(state.message);
      else if (state.errors?._form) toast.error(state.errors._form[0]);
   }, [state]);

   const errors = state?.errors;

   return (
      <Card>
         <CardHeader className="border-b">
            <CardTitle className="text-base font-semibold">Profile</CardTitle>
            <CardDescription>
               Your name and contact details. Only you and the MCLD team can see
               them.
            </CardDescription>
         </CardHeader>
         <form action={formAction} noValidate>
            <CardContent className="grid gap-4 pb-5 sm:grid-cols-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                     id="first_name"
                     name="first_name"
                     autoComplete="given-name"
                     value={firstName}
                     aria-invalid={!!errors?.first_name || undefined}
                     onChange={(e) => setFirstName(e.target.value)}
                  />
                  <FieldError errors={errors?.first_name} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                     id="last_name"
                     name="last_name"
                     autoComplete="family-name"
                     value={lastName}
                     aria-invalid={!!errors?.last_name || undefined}
                     onChange={(e) => setLastName(e.target.value)}
                  />
                  <FieldError errors={errors?.last_name} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">
                     Phone{" "}
                     <span className="font-normal text-muted-foreground">
                        (optional)
                     </span>
                  </Label>
                  <Input
                     id="phone"
                     name="phone"
                     type="tel"
                     autoComplete="tel"
                     value={phone}
                     aria-invalid={!!errors?.phone || undefined}
                     onChange={(e) => setPhone(e.target.value)}
                  />
                  <FieldError errors={errors?.phone} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gender">
                     Gender{" "}
                     <span className="font-normal text-muted-foreground">
                        (optional)
                     </span>
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                     <SelectTrigger id="gender" className="w-full">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value={GENDER_UNSET}>
                           Not specified
                        </SelectItem>
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
                     value={gender === GENDER_UNSET ? "" : gender}
                  />
                  <FieldError errors={errors?.gender} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dob">
                     Date of birth{" "}
                     <span className="font-normal text-muted-foreground">
                        (optional)
                     </span>
                  </Label>
                  <DobField value={dob} onChange={setDob} />
                  <FieldError errors={errors?.dob} />
               </div>
               <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="address">
                     Address{" "}
                     <span className="font-normal text-muted-foreground">
                        (optional)
                     </span>
                  </Label>
                  <Input
                     id="address"
                     name="address"
                     autoComplete="street-address"
                     value={address}
                     aria-invalid={!!errors?.address || undefined}
                     onChange={(e) => setAddress(e.target.value)}
                  />
                  <FieldError errors={errors?.address} />
               </div>
            </CardContent>
            <CardFooter className="justify-end border-t bg-muted/40 py-3.5">
               <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save profile"}
               </Button>
            </CardFooter>
         </form>
      </Card>
   );
}
