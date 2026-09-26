"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import type { EmailLinkType } from "@/lib/auth/email-links";
import { confirmEmailLink, type ConfirmLinkState } from "./actions";

const SIGNUP_HELP = {
   text: "If you already confirmed your email, just log in. Otherwise, log in with your email and password to get a new confirmation link.",
   href: "/login",
   label: "Go to log in",
};

// What to do when a link has expired, was already used, or isn't valid.
const DEAD_LINK_HELP: Record<
   EmailLinkType,
   { text: string; href: string; label: string }
> = {
   email: SIGNUP_HELP,
   signup: SIGNUP_HELP,
   invite: {
      text: "If you already accepted it, set your password with “Forgot password?”. Otherwise, ask the MCLD office to send you a new invitation.",
      href: "/auth/forgot-password",
      label: "Set my password",
   },
   recovery: {
      text: "Request a new password reset link.",
      href: "/auth/forgot-password",
      label: "Reset my password",
   },
   email_change: {
      text: "Ask the MCLD office to start the email change again.",
      href: "/login",
      label: "Go to log in",
   },
};

type ConfirmLinkFormProps = {
   type: EmailLinkType;
   tokenHash: string;
   next: string;
   email: string;
   actionLabel: string;
   signedInAs: string | null;
};

export function ConfirmLinkForm({
   type,
   tokenHash,
   next,
   email,
   actionLabel,
   signedInAs,
}: ConfirmLinkFormProps) {
   const [state, formAction, pending] = useActionState<
      ConfirmLinkState,
      FormData
   >(confirmEmailLink, null);

   if (state?.status === "email_change_pending") {
      return (
         <>
            <AuthAlert tone="success">
               Thanks, that address is confirmed. Now open the link we sent to
               the other address to finish the change. Until then, keep using
               your current address to log in.
            </AuthAlert>
            <Button asChild variant="outline" size="lg" className="w-full">
               <Link href="/login">Go to log in</Link>
            </Button>
         </>
      );
   }

   if (state?.status === "email_changed") {
      return (
         <>
            <AuthAlert tone="success">
               Your email address was changed. Use the new address next time you
               log in.
            </AuthAlert>
            <Button asChild size="lg" className="w-full">
               <Link href="/">Continue</Link>
            </Button>
         </>
      );
   }

   if (state?.status === "expired" || state?.status === "invalid") {
      const help = DEAD_LINK_HELP[type];
      return (
         <>
            <AuthAlert tone="error">
               {state.status === "expired"
                  ? "This link has expired or was already used."
                  : "This link isn't valid."}{" "}
               {help.text}
            </AuthAlert>
            <Button asChild variant="outline" size="lg" className="w-full">
               <Link href={help.href}>{help.label}</Link>
            </Button>
         </>
      );
   }

   return (
      <form action={formAction} className="space-y-5">
         {state?.status === "error" && (
            <AuthAlert tone="error">
               Something went wrong. Please try again in a few minutes.
            </AuthAlert>
         )}
         {signedInAs && (
            <p className="text-sm text-muted-foreground">
               You&apos;re signed in as <strong>{signedInAs}</strong> on this
               browser.{" "}
               {type === "email_change"
                  ? "Confirming may switch you to the account this link belongs to."
                  : "Continuing signs you out of that account."}
            </p>
         )}
         <input type="hidden" name="type" value={type} />
         <input type="hidden" name="token_hash" value={tokenHash} />
         <input type="hidden" name="next" value={next} />
         <input type="hidden" name="email" value={email} />
         <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : actionLabel}
         </Button>
      </form>
   );
}
