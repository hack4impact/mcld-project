import "server-only";

type AuthSettings = { mailer_autoconfirm?: boolean };

/**
 * Whether Supabase's "Confirm email" setting is on. When it's off, Supabase
 * finishes an email change on the first link either address clicks, so the
 * current address couldn't stop it.
 */
export async function emailConfirmationRequired(): Promise<boolean> {
   const url = new URL(
      "/auth/v1/settings",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
   );
   const res = await fetch(url, {
      headers: {
         apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
      },
      cache: "no-store",
   });
   if (!res.ok) {
      throw new Error(`Supabase auth settings returned ${res.status}`);
   }
   const settings = (await res.json()) as AuthSettings;
   return settings.mailer_autoconfirm === false;
}
