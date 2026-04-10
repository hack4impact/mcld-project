import type { InferSelectModel } from "drizzle-orm";
import type { services } from "@/lib/db/schema";

type ServiceRow = InferSelectModel<typeof services>;

/** Stripe Product `active` mirrors: listed as active and currently offered. */
export function stripeProductShouldBeActive(row: Pick<ServiceRow, "status" | "isOffered">): boolean {
   return row.status === "active" && row.isOffered;
}
