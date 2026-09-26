"use client";

import { useActionState } from "react";

import { AuthAlert } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   PASSWORD_MIN_LENGTH,
   type NewPasswordErrors,
} from "@/lib/auth/password";

export type NewPasswordState = { errors: NewPasswordErrors } | null;

function FieldError({ errors }: { errors?: string[] }) {
   if (!errors?.length) return null;
   return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function NewPasswordForm({
   action,
   submitLabel,
}: {
   action: (
      prev: NewPasswordState,
      formData: FormData,
   ) => Promise<NewPasswordState>;
   submitLabel: string;
}) {
   const [state, formAction, pending] = useActionState(action, null);

   return (
      <form action={formAction} className="space-y-5" noValidate>
         {state?.errors._form?.map((msg) => (
            <AuthAlert key={msg} tone="error">
               {msg}
            </AuthAlert>
         ))}
         <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
               id="password"
               name="password"
               type="password"
               autoComplete="new-password"
               minLength={PASSWORD_MIN_LENGTH}
               required
               className="h-10"
            />
            <p className="text-xs text-muted-foreground">
               At least {PASSWORD_MIN_LENGTH} characters.
            </p>
            <FieldError errors={state?.errors.password} />
         </div>
         <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
               id="confirm_password"
               name="confirm_password"
               type="password"
               autoComplete="new-password"
               required
               className="h-10"
            />
            <FieldError errors={state?.errors.confirm_password} />
         </div>
         <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
         </Button>
      </form>
   );
}
