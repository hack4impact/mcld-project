"use server";

import { redirect } from "next/navigation";

import type { NewPasswordState } from "@/app/auth/_components/new-password-form";
import {
   acceptedInviteRecently,
   getFreshLinkSession,
} from "@/lib/auth/link-session";
import { newPasswordSchema, passwordUpdateErrors } from "@/lib/auth/password";

const EXPIRED =
   "This invitation link has expired. If you already accepted it, use “Forgot password?” on the login page to set your password. Otherwise, ask the MCLD office to send you a new invitation.";

export async function setInvitePassword(
   _prev: NewPasswordState,
   formData: FormData,
): Promise<NewPasswordState> {
   const session = await getFreshLinkSession();
   if (!session) {
      return { errors: { _form: [EXPIRED] } };
   }

   const {
      data: { user },
   } = await session.supabase.auth.getUser();
   if (!acceptedInviteRecently(user)) {
      return { errors: { _form: [EXPIRED] } };
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
