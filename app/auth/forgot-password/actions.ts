"use server";

import { z } from "zod";

import { appUrl } from "@/lib/app-url";
import { createClient } from "@/utils/supabase/server";

export type ForgotPasswordState =
   | { errors: { email?: string[] } }
   | { sent: true; email: string }
   | null;

const schema = z.object({
   email: z.string().trim().email("Invalid email address"),
});

export async function requestPasswordReset(
   _prev: ForgotPasswordState,
   formData: FormData,
): Promise<ForgotPasswordState> {
   const parsed = schema.safeParse({ email: formData.get("email") });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }
   const { email } = parsed.data;

   const supabase = await createClient();
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl("/auth/callback?next=/auth/reset-password"),
   });
   if (error) {
      console.error(
         "[requestPasswordReset] failed",
         error.code ?? error.status,
      );
   }

   return { sent: true, email };
}
