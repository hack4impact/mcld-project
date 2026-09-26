"use server";

import { redirect } from "next/navigation";

import {
   findAccountByEmail,
   sendEmailChangedNotices,
   sendNotice,
} from "@/lib/auth/account-emails";
import { isEmailLinkType, type EmailLinkType } from "@/lib/auth/email-links";
import { nextPathFromLink } from "@/lib/auth/redirects";
import { createClient } from "@/utils/supabase/server";

export type ConfirmLinkState =
   | { status: "expired" | "invalid" | "error"; type: EmailLinkType | null }
   | { status: "email_change_pending" | "email_changed" }
   | null;

export async function confirmEmailLink(
   _prev: ConfirmLinkState,
   formData: FormData,
): Promise<ConfirmLinkState> {
   const type = formData.get("type");
   const tokenHash = formData.get("token_hash");
   if (!isEmailLinkType(type) || typeof tokenHash !== "string" || !tokenHash) {
      return { status: "invalid", type: null };
   }

   const supabase = await createClient();

   if (type !== "email_change") {
      await supabase.auth.signOut({ scope: "local" });
   }

   const currentEmail = formData.get("email");
   const account =
      type === "email_change" &&
      typeof currentEmail === "string" &&
      currentEmail
         ? await findAccountByEmail(currentEmail)
         : null;

   const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
   });
   if (error) {
      if (error.code === "otp_expired") return { status: "expired", type };
      const retryable =
         !error.status || error.status >= 500 || error.status === 429;
      return { status: retryable ? "error" : "invalid", type };
   }

   if (type === "email_change") {
      if (!data.session) return { status: "email_change_pending" };

      const newEmail = data.user?.email;
      if (
         account &&
         newEmail &&
         data.user?.id === account.id &&
         newEmail.toLowerCase() !== account.email.toLowerCase()
      ) {
         await sendNotice("email changed", () =>
            sendEmailChangedNotices({
               firstName: account.firstName,
               oldEmail: account.email,
               newEmail,
            }),
         );
      }
      return { status: "email_changed" };
   }

   if (type === "invite") redirect("/auth/set-password");
   if (type === "recovery") redirect("/auth/reset-password");
   if (data.user?.invited_at) redirect("/auth/set-password");
   redirect(nextPathFromLink(formData.get("next")));
}
