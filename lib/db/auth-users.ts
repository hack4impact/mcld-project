import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

const auth = pgSchema("auth");

/** Read-only view of Supabase Auth's users table. Not managed by Drizzle. */
export const authUsers = auth.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
   emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true }),
   invitedAt: timestamp("invited_at", { withTimezone: true }),
});
