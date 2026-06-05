import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/utils/supabase/server";

export async function requireAdmin() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   const { data: claimsData } = await supabase.auth.getClaims();
   const role = claimsData?.claims?.user_role;

   if (role !== ROLES.ADMIN) {
      redirect("/");
   }

   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
   });

   return { user, profile, supabase };
}
