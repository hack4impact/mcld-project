import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/roles";

export async function requireAdmin(): Promise<void> {
   const supabase = await createClient();
   const { data } = await supabase.auth.getClaims();
   if (data?.claims?.user_role !== ROLES.ADMIN) {
      throw new Error("Forbidden");
   }
}
