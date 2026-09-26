"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCooldown } from "@/hooks/use-cooldown";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const RESEND_COOLDOWN_SECONDS = 60;

function SentNotice({
   email,
   formAction,
   pending,
}: {
   email: string;
   formAction: (formData: FormData) => void;
   pending: boolean;
}) {
   const { remaining, start } = useCooldown(RESEND_COOLDOWN_SECONDS);

   return (
      <form action={formAction} onSubmit={start} className="space-y-4">
         <AuthAlert tone="success">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent
            it a link to reset the password. The link works once and expires
            after about an hour. Check your spam folder too.
         </AuthAlert>
         <input type="hidden" name="email" value={email} />
         <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={pending || remaining > 0}
         >
            {remaining > 0 ? `Send again in ${remaining}s` : "Send again"}
         </Button>
         <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Back to log in</Link>
         </Button>
      </form>
   );
}

export function ForgotPasswordForm() {
   const [state, formAction, pending] = useActionState<
      ForgotPasswordState,
      FormData
   >(requestPasswordReset, null);

   if (state && "sent" in state) {
      return (
         <SentNotice
            email={state.email}
            formAction={formAction}
            pending={pending}
         />
      );
   }

   const errors = state && "errors" in state ? state.errors : undefined;

   return (
      <form action={formAction} className="space-y-4" noValidate>
         <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
               id="email"
               name="email"
               type="email"
               autoComplete="email"
               placeholder="you@example.com"
               required
            />
            {errors?.email?.[0] && (
               <p className="text-sm text-destructive">{errors.email[0]}</p>
            )}
         </div>
         <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
         </Button>
         <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Back to log in</Link>
         </Button>
      </form>
   );
}
