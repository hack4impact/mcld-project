import { createClient } from "@/utils/supabase/server";
import { ROLES } from "@/lib/roles";

export async function requireUser(): Promise<{ userId: string }> {
   const supabase = await createClient();
   const { data } = await supabase.auth.getClaims();
   const claims = data?.claims;
   if (claims?.user_role !== ROLES.USER) {
      throw new Error("Forbidden");
   }
   return { userId: claims.sub };
}
