import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";

// Sessions created by an email link (verifyOtp) carry "otp" in the access
// token's amr claim; the others are what older PKCE links produce. Only these
// may set a new password without knowing the old one.
const EMAIL_LINK_METHODS = new Set([
   "otp",
   "recovery",
   "invite",
   "magiclink",
   "email/signup",
   "email_change",
]);

export const LINK_SESSION_MAX_AGE_SECONDS = 30 * 60;

/** Newest time (unix seconds) an email link was verified in this session. */
export function latestEmailLinkVerification(amr: unknown): number | null {
   if (!Array.isArray(amr)) return null;
   let latest: number | null = null;
   for (const entry of amr) {
      if (typeof entry !== "object" || entry === null) continue;
      const { method, timestamp } = entry as {
         method?: unknown;
         timestamp?: unknown;
      };
      if (
         typeof method === "string" &&
         EMAIL_LINK_METHODS.has(method) &&
         typeof timestamp === "number"
      ) {
         latest = latest === null ? timestamp : Math.max(latest, timestamp);
      }
   }
   return latest;
}

export type LinkSession = {
   supabase: SupabaseClient;
   userId: string;
   email: string | null;
};

/**
 * The signed-in session, if it came from an email link in the last 30
 * minutes. The account always comes from the verified token, never from
 * anything the browser submits.
 */
export async function getFreshLinkSession(): Promise<LinkSession | null> {
   const supabase = await createClient();
   const { data } = await supabase.auth.getClaims();
   const claims = data?.claims;
   if (!claims?.sub) return null;

   const verifiedAt = latestEmailLinkVerification(claims.amr);
   const now = Math.floor(Date.now() / 1000);
   if (verifiedAt === null || now - verifiedAt > LINK_SESSION_MAX_AGE_SECONDS) {
      return null;
   }

   return {
      supabase,
      userId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
   };
}

/**
 * The person accepted an invitation (confirming their address) in the last 30
 * minutes. Only then may /auth/set-password set a password without the usual
 * reset flow.
 */
export function acceptedInviteRecently(
   user: { invited_at?: string; email_confirmed_at?: string } | null,
   now = Date.now(),
): boolean {
   if (!user?.invited_at || !user.email_confirmed_at) return false;
   const confirmedAt = Date.parse(user.email_confirmed_at);
   return now - confirmedAt <= LINK_SESSION_MAX_AGE_SECONDS * 1000;
}
