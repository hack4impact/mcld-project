import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq} from "drizzle-orm";
import type { ReadOnlyUserRow, UserRow } from "./profile-role-label";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

const USERS_SUBSCRIPTION_STATUS_ACTIVE = "active" as const;
const USERS_SUBSCRIPTION_STATUS_TRIAL = "trialing" as const;

const auth = pgSchema("auth");

 const authUsers = auth.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

const readOnlyColumns = {
   id: profiles.id,
   firstName: profiles.firstName,
   lastName: profiles.lastName,
   role: profiles.role,
   lastLoginAt: profiles.lastLoginAt,
   subscriptionStatus: subscriptions.status,
   email: authUsers.email,
};

type ReadOnlyColumnsRow = {
   id: string;
   firstName: string;
   lastName: string;
   role: string;
   lastLoginAt: Date;
   subscriptionStatus: string | null;
   email: string | null;
};

function toReadOnlyUserRow(row: ReadOnlyColumnsRow): ReadOnlyUserRow {
   return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      lastLoginAt: row.lastLoginAt,
      email: row.email ?? "",
      isActive: row.subscriptionStatus === USERS_SUBSCRIPTION_STATUS_ACTIVE || row.subscriptionStatus === USERS_SUBSCRIPTION_STATUS_TRIAL,
   };
}

export async function listReadOnlyUsers(): Promise<ReadOnlyUserRow[]> {
   const rows = await db
      .select(readOnlyColumns)
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id));

   return rows.map(toReadOnlyUserRow);
}

export async function listUsersWithEmails(): Promise<UserRow[]> {
   const rows = await db
      .select({ ...readOnlyColumns, stripeCustomerId: profiles.stripeCustomerId })
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id));

   return rows.map((row) => ({
      ...toReadOnlyUserRow(row),
      stripeCustomerId: row.stripeCustomerId ?? null,
   }));
}

export async function listDistinctProfileRoles(): Promise<string[]> {
   const rows = await db
      .selectDistinct({ role: profiles.role })
      .from(profiles)
      .orderBy(profiles.role);

   return rows.map((r) => r.role);
}

