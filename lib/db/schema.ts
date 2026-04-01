import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "coach", "user"]);

export const profiles = pgTable("profiles", {
   id: uuid("id").primaryKey(),
   firstName: text("first_name"),
   lastName: text("last_name"),
   avatarUrl: text("avatar_url"),
   stripeCustomerId: text("stripe_customer_id"),
   role: userRoleEnum("role").default("user").notNull(),
   createdAt: timestamp("created_at").defaultNow(),
   updatedAt: timestamp("updated_at"),
});
