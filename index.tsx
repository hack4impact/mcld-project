import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./drizzle/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  // Disable prefetch as it is not supported for "Transaction" pool mode
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  const allUsers = await db.select().from(users);
  console.log(allUsers);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
