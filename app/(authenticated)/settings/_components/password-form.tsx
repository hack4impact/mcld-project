"use client";

import { useActionState, useEffect, useRef } from "react";
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
   changeOwnPassword,
   type SettingsActionState,
} from "@/app/(authenticated)/settings/actions";

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function PasswordForm() {
   const [state, formAction, pending] = useActionState<
      SettingsActionState,
      FormData
   >(changeOwnPassword, null);

   const handled = useRef<SettingsActionState>(null);
   useEffect(() => {
      if (!state || state === handled.current) return;
      handled.current = state;
      if (state.message) {
         toast.success(state.message);
      } else if (state.errors?._form) {
         toast.error(state.errors._form[0]);
      }
   }, [state]);

   const errors = state?.message ? undefined : state?.errors;

   return (
      <Card>
         <CardHeader className="border-b">
            <CardTitle className="text-base font-semibold">Password</CardTitle>
            <CardDescription>
               Enter your current password to choose a new one. It must be at
               least 8 characters.
            </CardDescription>
         </CardHeader>
         <form action={formAction} noValidate>
            <CardContent className="grid gap-4 pb-5 sm:grid-cols-2">
               <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                  <Label htmlFor="current_password">Current password</Label>
                  <Input
                     id="current_password"
                     name="current_password"
                     type="password"
                     autoComplete="current-password"
                     aria-invalid={!!errors?.current_password || undefined}
                  />
                  <FieldError errors={errors?.current_password} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                     id="new_password"
                     name="new_password"
                     type="password"
                     autoComplete="new-password"
                     aria-invalid={!!errors?.new_password || undefined}
                  />
                  <FieldError errors={errors?.new_password} />
               </div>
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input
                     id="confirm_password"
                     name="confirm_password"
                     type="password"
                     autoComplete="new-password"
                     aria-invalid={!!errors?.confirm_password || undefined}
                  />
                  <FieldError errors={errors?.confirm_password} />
               </div>
            </CardContent>
            <CardFooter className="justify-end border-t bg-muted/40 py-3.5">
               <Button type="submit" disabled={pending}>
                  {pending ? "Changing…" : "Change password"}
               </Button>
            </CardFooter>
         </form>
      </Card>
   );
}
