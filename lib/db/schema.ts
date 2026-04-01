import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "coach", "user"]);

export const profiles = pgTable("profiles", {
   id: uuid("id").primaryKey(),
   fullName: text("full_name"),
   avatarUrl: text("avatar_url"),
   role: userRoleEnum("role").default("user").notNull(),
   createdAt: timestamp("created_at").defaultNow(),
});
