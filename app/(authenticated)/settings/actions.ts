"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { changeOwnPasswordSchema, updateOwnProfileSchema } from "./schema";

export type SettingsActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const SETTINGS_PATH = "/settings";

async function currentUser() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   return user ? { supabase, user } : null;
}

export async function updateOwnProfile(
   _prev: SettingsActionState,
   formData: FormData,
): Promise<SettingsActionState> {
   const session = await currentUser();
   if (!session) return { errors: { _form: ["You must be signed in."] } };
   const { supabase, user } = session;

   const parsed = updateOwnProfileSchema.safeParse({
      first_name: formData.get("first_name") ?? "",
      last_name: formData.get("last_name") ?? "",
      address: formData.get("address"),
      gender: formData.get("gender"),
      dob: formData.get("dob"),
      phone: formData.get("phone"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { first_name, last_name, address, gender, dob, phone } = parsed.data;

   const { error: metadataError } = await supabase.auth.updateUser({
      data: { first_name, last_name },
   });
   if (metadataError) {
      return {
         errors: { _form: ["Could not save your name. Please try again."] },
      };
   }

   try {
      await db
         .update(profiles)
         .set({
            firstName: first_name,
            lastName: last_name,
            address,
            gender,
            dob,
            phone,
            updatedAt: new Date(),
         })
         .where(eq(profiles.id, user.id));
   } catch {
      return {
         errors: {
            _form: ["Failed to update your profile. Please try again."],
         },
      };
   }

   revalidatePath(SETTINGS_PATH, "layout");
   return { message: "Profile updated." };
}

async function isCurrentPassword(
   email: string,
   password: string,
): Promise<boolean> {
   const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
   );
   const { error } = await verifier.auth.signInWithPassword({
      email,
      password,
   });
   if (error) return false;
   await verifier.auth.signOut({ scope: "local" });
   return true;
}

export async function changeOwnPassword(
   _prev: SettingsActionState,
   formData: FormData,
): Promise<SettingsActionState> {
   const session = await currentUser();
   if (!session) return { errors: { _form: ["You must be signed in."] } };
   const { user } = session;

   const parsed = changeOwnPasswordSchema.safeParse({
      current_password: formData.get("current_password") ?? "",
      new_password: formData.get("new_password") ?? "",
      confirm_password: formData.get("confirm_password") ?? "",
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { current_password, new_password } = parsed.data;
   if (
      !user.email ||
      !(await isCurrentPassword(user.email, current_password))
   ) {
      return {
         errors: { current_password: ["Current password is incorrect"] },
      };
   }

   const { error } = await createAdminClient().auth.admin.updateUserById(
      user.id,
      { password: new_password },
   );
   if (error) {
      return {
         errors: {
            new_password: [
               error.message ||
                  "Could not change your password. Please try again.",
            ],
         },
      };
   }

   return { message: "Password changed." };
}
