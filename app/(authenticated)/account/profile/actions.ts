"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/current-user";
import { updateProfileSchema } from "./schema";

export type ProfileActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

export async function updateMyProfile(
   _prev: ProfileActionState,
   formData: FormData,
): Promise<ProfileActionState> {
   const user = await getCurrentUser();

   if (!user) {
      return { errors: { _form: ["You must be signed in to do that."] } };
   }

   const parsed = updateProfileSchema.safeParse({
      first_name: formData.get("first_name") ?? "",
      last_name: formData.get("last_name") ?? "",
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      dob: formData.get("dob") ?? "",
      gender: formData.get("gender") ?? "",
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { first_name, last_name, phone, address, dob, gender } = parsed.data;

   try {
      await db
         .update(profiles)
         .set({
            firstName: first_name,
            lastName: last_name,
            phone,
            address,
            dob,
            gender: gender as typeof profiles.$inferInsert.gender,
            updatedAt: new Date(),
         })
         .where(eq(profiles.id, user.id));
   } catch (error) {
      console.error("Failed to update profile", error);
      return { errors: { _form: ["Could not save your profile. Try again."] } };
   }

   revalidatePath("/account/profile");
   revalidatePath("/account");

   return { message: "Profile updated." };
}
