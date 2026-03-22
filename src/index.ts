import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { usersTable } from "./db/schema";

async function main() {
   const databaseUrl = process.env.DATABASE_URL;

   if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set.");
   }

   // Supabase transaction pool mode does not support prepared statements.
   const client = postgres(databaseUrl, { prepare: false });
   const db = drizzle({ client });

   const user: typeof usersTable.$inferInsert = {
      name: "John",
      age: 30,
      email: "john@example.com",
   };

   await db.insert(usersTable).values(user);
   console.log("New user created!");

   const users = await db.select().from(usersTable);
   console.log("Getting all users from the database:", users);

   await db
      .update(usersTable)
      .set({ age: 31 })
      .where(eq(usersTable.email, user.email));
   console.log("User info updated!");

   await db.delete(usersTable).where(eq(usersTable.email, user.email));
   console.log("User deleted!");

   await client.end();
}

main().catch((error) => {
   console.error(error);
   process.exit(1);
});
