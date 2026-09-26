import { createClient } from "@/utils/supabase/server";
import { ROLES, type Role } from "@/lib/roles";

/**
 * Resolve the current user's role from Supabase auth claims, or null if the
 * user is unauthenticated / has no role claim.
 */
export async function getUserRole(): Promise<Role | null> {
   const supabase = await createClient();
   const { data } = await supabase.auth.getClaims();
   const role = data?.claims?.user_role;
   if (role === ROLES.ADMIN || role === ROLES.COORDINATOR || role === ROLES.USER)
      return role;
   return null;
}

export async function requireAdmin(): Promise<void> {
   const role = await getUserRole();
   if (role !== ROLES.ADMIN) {
      throw new Error("Forbidden");
   }
}

export async function requireCoordinatorOrAdmin(): Promise<void> {
   const role = await getUserRole();
   if (role !== ROLES.ADMIN && role !== ROLES.COORDINATOR) {
      throw new Error("Forbidden");
   }
}
