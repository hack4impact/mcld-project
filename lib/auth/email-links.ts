import type { EmailOtpType } from "@supabase/supabase-js";

import { appUrl } from "@/lib/app-url";

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

export function confirmLinkUrl(params: {
   tokenHash: string;
   type: EmailLinkType;
   email?: string;
}): string {
   const query = new URLSearchParams({
      token_hash: params.tokenHash,
      type: params.type,
   });
   if (params.email) query.set("email", params.email);
   return appUrl(`/auth/confirm?${query.toString()}`);
}
