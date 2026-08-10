import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { isAdminRole, ROLES, type Role } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export type CurrentUser = {
   id: string;
   email: string;
   role: Role;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) return null;

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: { role: true },
   });

   return {
      id: user.id,
      email: user.email ?? "",
      role: profile?.role ?? ROLES.USER,
   };
});

export async function requireAdminArea(): Promise<CurrentUser> {
   const user = await getCurrentUser();

   if (!user) redirect("/login");
   if (!isAdminRole(user.role)) redirect("/account");

   return user;
}
