import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

/** Distinct `profiles.role` values present in the database. */
export async function listDistinctProfileRoles(): Promise<string[]> {
   const rows = await db
      .selectDistinct({ role: profiles.role })
      .from(profiles)
      .orderBy(profiles.role);

   return rows.map((r) => r.role);
}
