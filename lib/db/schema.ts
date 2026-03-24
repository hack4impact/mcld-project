import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
   id: uuid("id").primaryKey(),
   fullName: text("full_name"),
   avatarUrl: text("avatar_url"),
   createdAt: timestamp("created_at").defaultNow(),
});
