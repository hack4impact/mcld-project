"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, signupSchema } from "./schema";

export type ActionState = {
  errors: Partial<Record<string, string[]>>;
} | null;

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
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return { errors: { email: [error.message] } };
  }

  redirect("/");
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) {
    return { errors: { email: [error.message] } };
  }

  redirect("/login?message=Check+your+email+to+confirm+your+account.");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
