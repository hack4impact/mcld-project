"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { createUserAdminSchema, updateUserAdminSchema } from "./schema";
import { grantComplimentarySubscription } from "@/lib/stripe";

export type UserAdminActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   data?: Record<string, string>;
} | null;

const USERS_PATH = "/users";

export async function updateUserAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = updateUserAdminSchema.safeParse({
      user_id: formData.get("user_id"),
      email: formData.get("email"),
      role: formData.get("role"),
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { user_id, email, role } = parsed.data;

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user_id),
   });

   if (!profile) {
      return { errors: { _form: ["User not found"] } };
   }

   const admin = createAdminClient();
   const { error: authError } = await admin.auth.admin.updateUserById(
      user_id,
      { email, app_metadata: { user_role: role } },
   );

   if (authError) {
      const message = /prod_|price_|stripe/i.test(authError.message)
         ? "Something went wrong. Please try again."
         : authError.message;
      if (authError.message.toLowerCase().includes("email")) {
         return { errors: { email: [message] } };
      }
      return { errors: { _form: [message] } };
   }

   await db
      .update(profiles)
      .set({ role: role as Role, updatedAt: new Date() })
      .where(eq(profiles.id, user_id));

   revalidatePath(USERS_PATH);
   return { message: "User updated." };
}

export async function createUserAdmin(
   _prev: UserAdminActionState,
   formData: FormData,
): Promise<UserAdminActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = createUserAdminSchema.safeParse({
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirm_password: formData.get("confirm_password"),
      role: formData.get("role"),
      subscription_months: formData.get("subscription_months") ?? "0",
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const {
      first_name,
      last_name,
      email,
      password,
      role,
      subscription_months,
   } = parsed.data;

   const admin = createAdminClient();
   const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
         email,
         password,
         email_confirm: true,
         user_metadata: {
            first_name,
            last_name,
         },
         app_metadata: {
            user_role: role as Role,
         },
      });

   if (authError || !authData.user) {
      const raw = authError?.message ?? "Could not create user";
      const message = /prod_|price_|stripe/i.test(raw)
         ? "Something went wrong. Please try again."
         : raw;
      if (raw.toLowerCase().includes("email")) {
         return { errors: { email: [message] } };
      }
      return { errors: { _form: [message] } };
   }

   const userId = authData.user.id;

   try {
      await db
         .insert(profiles)
         .values({
            id: userId,
            firstName: first_name,
            lastName: last_name,
            role: role as Role,
            lastLoginAt: new Date(),
         })
         .onConflictDoUpdate({
            target: profiles.id,
            set: {
               firstName: first_name,
               lastName: last_name,
               role: role as Role,
               updatedAt: new Date(),
            },
         });
   } catch {
      return { errors: { _form: ["Could not create user"] } };
   }

   if (role === ROLES.USER && subscription_months > 0) {
      try {
         await grantComplimentarySubscription(
            userId,
            email,
            subscription_months,
         );
      } catch {
         return {
            errors: {
               _form: [
                  "User was created, but the complimentary subscription could not be added. Please try again or contact support.",
               ],
            },
            data: { user_id: userId },
         };
      }
   }

   revalidatePath(USERS_PATH);
   return { message: "User created.", data: { user_id: userId } };
}
