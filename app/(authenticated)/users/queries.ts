import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq} from "drizzle-orm";
import type { UserRow } from "./profile-role-label";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

const USERS_SUBSCRIPTION_STATUS_ACTIVE = "active" as const;

const auth = pgSchema("auth");

/** Read-only model for Supabase Auth — not managed by Drizzle migrations. */
 const authUsers = auth.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

/** Profiles joined to Supabase Auth emails and subscription status. */
export async function listUsersWithEmails(): Promise<UserRow[]> {
   const rows = await db
      .select({
         id: profiles.id,
         firstName: profiles.firstName,
         lastName: profiles.lastName,
         role: profiles.role,
         lastLoginAt: profiles.lastLoginAt,
         stripeCustomerId: profiles.stripeCustomerId,
         subscriptionStatus: subscriptions.status,
         email: authUsers.email,
      })
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id));

   return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      lastLoginAt: row.lastLoginAt,
      stripeCustomerId: row.stripeCustomerId ?? null,
      email: row.email ?? "",
      isActive: row.subscriptionStatus === USERS_SUBSCRIPTION_STATUS_ACTIVE,
   }));
}

/** Distinct `profiles.role` values present in the database. */
export async function listDistinctProfileRoles(): Promise<string[]> {
   const rows = await db
      .selectDistinct({ role: profiles.role })
      .from(profiles)
      .orderBy(profiles.role);

   return rows.map((r) => r.role);
}

