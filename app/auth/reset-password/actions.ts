"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import type { NewPasswordState } from "@/app/auth/_components/new-password-form";
import {
   sendNotice,
   sendPasswordChangedNotice,
} from "@/lib/auth/account-emails";
import { getFreshLinkSession } from "@/lib/auth/link-session";
import { newPasswordSchema, passwordUpdateErrors } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function resetPassword(
   _prev: NewPasswordState,
   formData: FormData,
): Promise<NewPasswordState> {
   const session = await getFreshLinkSession();
   if (!session) {
      return {
         errors: {
            _form: ["This reset link has expired. Request a new one."],
         },
      };
   }

   const parsed = newPasswordSchema.safeParse({
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { error } = await session.supabase.auth.updateUser({
      password: parsed.data.password,
   });
   if (error) {
      return { errors: passwordUpdateErrors(error) };
   }

   await session.supabase.auth.signOut({ scope: "global" });

   const to = session.email;
   if (to) {
      await sendNotice("password changed", async () => {
         const profile = await db.query.profiles.findFirst({
            where: eq(profiles.id, session.userId),
            columns: { firstName: true },
         });
         await sendPasswordChangedNotice({
            to,
            firstName: profile?.firstName ?? null,
         });
      });
   }

   redirect("/login?notice=password_updated");
}
