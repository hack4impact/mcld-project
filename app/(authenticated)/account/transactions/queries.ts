import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
   listCustomerCharges,
   type PaginatedTransactions,
} from "@/lib/stripe-transactions";

const TRANSACTIONS_PAGE_SIZE = 25;

export async function listMyTransactions(
   userId: string,
): Promise<PaginatedTransactions> {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { stripeCustomerId: true },
   });

   if (!profile?.stripeCustomerId) {
      return { data: [], hasMore: false, firstId: null, lastId: null };
   }

   return listCustomerCharges({
      customerId: profile.stripeCustomerId,
      limit: TRANSACTIONS_PAGE_SIZE,
   });
}
