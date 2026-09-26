import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/utils/supabase/server";

const EMAIL_LINK_METHODS = new Set([
   "otp",
   "recovery",
   "invite",
   "magiclink",
   "email/signup",
   "email_change",
]);

export const LINK_SESSION_MAX_AGE_SECONDS = 30 * 60;

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

export function acceptedInviteRecently(
   user: { invited_at?: string; email_confirmed_at?: string } | null,
   now = Date.now(),
): boolean {
   if (!user?.invited_at || !user.email_confirmed_at) return false;
   const confirmedAt = Date.parse(user.email_confirmed_at);
   return now - confirmedAt <= LINK_SESSION_MAX_AGE_SECONDS * 1000;
}
