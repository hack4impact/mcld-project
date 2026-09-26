import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { ROLES, type Role } from "@/lib/roles";

export const getUserRole = cache(async (): Promise<Role | null> => {
   const supabase = await createClient();
   const { data } = await supabase.auth.getClaims();
   const role = data?.claims?.user_role;
   if (
      role === ROLES.ADMIN ||
      role === ROLES.COORDINATOR ||
      role === ROLES.USER
   )
      return role;
   return null;
});

export async function requireAdmin(): Promise<void> {
   const role = await getUserRole();
   if (role !== ROLES.ADMIN) {
      throw new Error("Forbidden");
   }
}
