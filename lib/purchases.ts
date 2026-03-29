import { db } from "@/lib/db";
import { purchases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserPurchases(userId: string) {
   return db.query.purchases.findMany({
      where: eq(purchases.userId, userId),
   });
}

export async function hasUserPurchased(userId: string, priceId: string) {
   const userPurchases = await getUserPurchases(userId);
   return userPurchases.some((p) => p.stripePriceId === priceId);
}
