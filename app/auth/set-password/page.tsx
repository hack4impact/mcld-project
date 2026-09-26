import Link from "next/link";
import { Suspense } from "react";

import { NewPasswordForm } from "@/app/auth/_components/new-password-form";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getFreshLinkSession } from "@/lib/auth/link-session";
import { setInvitePassword } from "./actions";

export default function SetPasswordPage() {
   return (
      <Suspense
         fallback={
            <div className="flex min-h-screen items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <SetPasswordContent />
      </Suspense>
   );
}

async function SetPasswordContent() {
   const session = await getFreshLinkSession();
   const user = session
      ? (await session.supabase.auth.getUser()).data.user
      : null;

   if (!user?.invited_at) {
      return (
         <AuthCard
            title="Invitation link expired"
            description="Invitation links work once and only for a short time. Ask the MCLD office to send you a new invitation."
         >
            <Button asChild variant="outline" className="w-full">
               <Link href="/login">Go to log in</Link>
            </Button>
         </AuthCard>
      );
   }

   return (
      <AuthCard
         title="Welcome to MCLD"
         description={`Choose a password for ${user.email ?? "your account"}. You'll use it to log in.`}
      >
         <NewPasswordForm
            action={setInvitePassword}
            submitLabel="Set password and continue"
         />
      </AuthCard>
   );
}
