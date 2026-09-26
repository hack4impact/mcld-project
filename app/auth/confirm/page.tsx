import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { isEmailLinkType, type EmailLinkType } from "@/lib/auth/email-links";
import { createClient } from "@/utils/supabase/server";
import { ConfirmLinkForm } from "./confirm-link-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SIGNUP_COPY = {
   title: "Confirm your email",
   description:
      "Confirm your email address to finish creating your MCLD account.",
   action: "Confirm my email",
};

const COPY: Record<
   EmailLinkType,
   { title: string; description: string; action: string }
> = {
   email: SIGNUP_COPY,
   signup: SIGNUP_COPY,
   invite: {
      title: "Accept your invitation",
      description:
         "Accept your invitation to MCLD. Next, you'll choose a password.",
      action: "Accept invitation",
   },
   recovery: {
      title: "Reset your password",
      description: "Continue to choose a new password for your MCLD account.",
      action: "Continue",
   },
   email_change: {
      title: "Confirm email change",
      description: "Confirm this step of changing your MCLD email address.",
      action: "Confirm",
   },
};

function first(value: string | string[] | undefined): string | undefined {
   return Array.isArray(value) ? value[0] : value;
}

export default function ConfirmPage({
   searchParams,
}: {
   searchParams: SearchParams;
}) {
   return (
      <Suspense
         fallback={
            <div className="flex min-h-screen items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <ConfirmContent searchParams={searchParams} />
      </Suspense>
   );
}

async function ConfirmContent({
   searchParams,
}: {
   searchParams: SearchParams;
}) {
   const params = await searchParams;
   const type = first(params.type);
   const tokenHash = first(params.token_hash);

   if (!isEmailLinkType(type) || !tokenHash) {
      return (
         <AuthCard
            title="This link isn't valid"
            description="It may be incomplete. Check that you opened the whole link from the email, or request a new one."
         >
            <Button asChild variant="outline" size="lg" className="w-full">
               <Link href="/login">Go to log in</Link>
            </Button>
         </AuthCard>
      );
   }

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   const copy = COPY[type];

   return (
      <AuthCard title={copy.title} description={copy.description}>
         <ConfirmLinkForm
            type={type}
            tokenHash={tokenHash}
            next={first(params.next) ?? ""}
            email={first(params.email) ?? ""}
            actionLabel={copy.action}
            signedInAs={user?.email ?? null}
         />
      </AuthCard>
   );
}
