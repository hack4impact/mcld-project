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

   // These links sign in the account they belong to, so end any other session
   // on this browser first (e.g. an admin who opens someone's invite).
   if (type !== "email_change") {
      await supabase.auth.signOut({ scope: "local" });
   }

   // A completed email change replaces the current address, so look up the
   // account it belongs to before verifying.
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
      // Expired, already used and unknown links all come back as otp_expired.
      if (error.code === "otp_expired") return { status: "expired", type };
      // Rate limits and server errors leave the link unused, so it can be retried.
      const retryable =
         error.status === undefined ||
         error.status >= 500 ||
         error.status === 429;
      return { status: retryable ? "error" : "invalid", type };
   }

   if (type === "email_change") {
      // With secure email change, the first link only records one approval.
      if (!data.session) return { status: "email_change_pending" };

      // `email` comes from the link, so only trust it once the verified
      // account matches.
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
   redirect(nextPathFromLink(formData.get("next")));
}
