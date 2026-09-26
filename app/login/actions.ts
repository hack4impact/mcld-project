"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, resendSchema, signupSchema } from "./schema";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { appUrl } from "@/lib/app-url";
import { safeNextPath } from "@/lib/auth/redirects";
import { EMAIL_NOT_SENT, isTemporarySendFailure } from "@/lib/auth/send-errors";

export type ActionState = {
  errors: Partial<Record<string, string[]>>;
  checkEmail?: string;
  unconfirmedEmail?: string;
  resent?: boolean;
} | null;

const TOO_MANY_ATTEMPTS =
  "Too many attempts right now. Please wait a few minutes and try again.";

function signupErrorMessage(error: AuthError): string {
  if (
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  ) {
    return TOO_MANY_ATTEMPTS;
  }
  return error.message;
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error , data} = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        errors: {
          email: [
            "Confirm your email address before logging in. Check your inbox for the link.",
          ],
        },
        unconfirmedEmail: result.data.email,
      };
    }
    return { errors: { email: [error.message] } };
  }

  await updateUserLastLoginAt(data.user.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function signup(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = signupSchema.safeParse({
    firstName: formData.get("first_name"),
    lastName: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { firstName, lastName, email, password } = result.data;
  const next = safeNextPath(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: appUrl(next),
    },
  });

  if (error) {
    return { errors: { email: [signupErrorMessage(error)] } };
  }

  if (data.session) {
    redirect(next);
  }

  return { errors: {}, checkEmail: email };
}

export async function resendConfirmation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = resendSchema.safeParse({ email: formData.get("email") });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const { email } = result.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: appUrl(safeNextPath(formData.get("next"))) },
  });
  if (error) {
    console.error("[resendConfirmation] failed", error.code ?? error.status);
    if (isTemporarySendFailure(error)) {
      return { errors: { email: [EMAIL_NOT_SENT] } };
    }
  }

  return { errors: {}, checkEmail: email, resent: true };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function  updateUserLastLoginAt(userId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!profile) {
    return;
  }

  await db.update(profiles).set({ lastLoginAt: new Date()}).where(eq(profiles.id, profile.id));
}
