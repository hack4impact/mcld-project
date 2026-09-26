"use server";

import { redirect } from "next/navigation";

import type { NewPasswordState } from "@/app/auth/_components/new-password-form";
import { getFreshLinkSession } from "@/lib/auth/link-session";
import { newPasswordSchema, passwordUpdateErrors } from "@/lib/auth/password";

const EXPIRED =
   "This invitation link has expired. Ask the MCLD office to send you a new one.";

export async function setInvitePassword(
   _prev: NewPasswordState,
   formData: FormData,
): Promise<NewPasswordState> {
   // The account comes from the verified invite link's session, never from the form.
   const session = await getFreshLinkSession();
   if (!session) {
      return { errors: { _form: [EXPIRED] } };
   }

   const {
      data: { user },
   } = await session.supabase.auth.getUser();
   if (!user?.invited_at) {
      return {
         errors: { _form: ["This page is only for accepting an invitation."] },
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

   redirect("/");
}
