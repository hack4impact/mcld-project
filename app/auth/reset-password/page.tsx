import Link from "next/link";
import { Suspense } from "react";

import { NewPasswordForm } from "@/app/auth/_components/new-password-form";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getFreshLinkSession } from "@/lib/auth/link-session";
import { resetPassword } from "./actions";

export default function ResetPasswordPage() {
   return (
      <Suspense
         fallback={
            <div className="flex min-h-screen items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <ResetPasswordContent />
      </Suspense>
   );
}

async function ResetPasswordContent() {
   const session = await getFreshLinkSession();

   if (!session) {
      return (
         <AuthCard
            title="Reset link expired"
            description="Password reset links work once and only for a short time. Request a new one to continue."
         >
            <Button asChild className="w-full">
               <Link href="/auth/forgot-password">Request a new link</Link>
            </Button>
         </AuthCard>
      );
   }

   return (
      <AuthCard
         title="Choose a new password"
         description="You'll be signed out everywhere and asked to log in with the new password."
      >
         <NewPasswordForm
            action={resetPassword}
            submitLabel="Change password"
         />
      </AuthCard>
   );
}
