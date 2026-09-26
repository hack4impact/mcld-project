import type { EmailOtpType } from "@supabase/supabase-js";

import { appUrl } from "@/lib/app-url";

/** Link types handled by /auth/confirm. `email` is what signup links use. */
export const EMAIL_LINK_TYPES = [
   "email",
   "signup",
   "invite",
   "recovery",
   "email_change",
] as const satisfies readonly EmailOtpType[];

export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function isEmailLinkType(value: unknown): value is EmailLinkType {
   return (EMAIL_LINK_TYPES as readonly unknown[]).includes(value);
}

/**
 * Link to /auth/confirm, which verifies the token hash only after the person
 * clicks a button. That works on any device and survives email scanners that
 * open links ahead of the user.
 */
export function confirmLinkUrl(params: {
   tokenHash: string;
   type: EmailLinkType;
   // The account's current email, so an email change can notify it.
   email?: string;
}): string {
   const query = new URLSearchParams({
      token_hash: params.tokenHash,
      type: params.type,
   });
   if (params.email) query.set("email", params.email);
   return appUrl(`/auth/confirm?${query.toString()}`);
}
