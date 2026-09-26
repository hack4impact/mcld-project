import { eq, inArray } from "drizzle-orm";
import { pgSchema, text, uuid } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { children, profiles, services } from "@/lib/db/schema";
import { listCashSessions, type CashSessionRecord } from "@/lib/cash-sessions";

const authUsers = pgSchema("auth").table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

export type CashSessionDetails = Pick<
   CashSessionRecord,
   "sessionAt" | "durationMinutes" | "amountCents" | "currency"
>;

export type CashSessionRegistration = CashSessionRecord & {
   service: typeof services.$inferSelect;
   profile: { id: string; firstName: string; lastName: string; email: string };
   child: typeof children.$inferSelect | null;
};

// Authorization belongs to the page/action calling this server-side reader.
// Invoice metadata is still checked against current account/child ownership.
export async function loadCashSessionRegistrations({
   userId,
   serviceId,
}: {
   userId?: string;
   serviceId?: string;
}): Promise<CashSessionRegistration[]> {
   let customerId: string | undefined;
   if (userId) {
      const profile = await db.query.profiles.findFirst({
         where: eq(profiles.id, userId),
         columns: { stripeCustomerId: true },
      });
      if (!profile?.stripeCustomerId) return [];
      customerId = profile.stripeCustomerId;
   }

   const records = (await listCashSessions({ customerId, serviceId })).filter(
      (record) =>
         (!userId || record.userId === userId) &&
         (!serviceId || record.serviceId === serviceId),
   );
   if (!records.length) return [];

   const serviceIds = [...new Set(records.map((record) => record.serviceId))];
   const userIds = [...new Set(records.map((record) => record.userId))];
   const childIds = [
      ...new Set(
         records.flatMap((record) => (record.childId ? [record.childId] : [])),
      ),
   ];
   const [serviceRows, profileRows, childRows] = await Promise.all([
      db.select().from(services).where(inArray(services.id, serviceIds)),
      db
         .select({
            id: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            email: authUsers.email,
         })
         .from(profiles)
         .innerJoin(authUsers, eq(authUsers.id, profiles.id))
         .where(inArray(profiles.id, userIds)),
      childIds.length
         ? db.select().from(children).where(inArray(children.id, childIds))
         : Promise.resolve([]),
   ]);
   const servicesById = new Map(serviceRows.map((row) => [row.id, row]));
   const profilesById = new Map(profileRows.map((row) => [row.id, row]));
   const childrenById = new Map(childRows.map((row) => [row.id, row]));

   return records.flatMap((record) => {
      const service = servicesById.get(record.serviceId);
      const profile = profilesById.get(record.userId);
      const child = record.childId ? childrenById.get(record.childId) : null;
      if (!service || service.type !== "private_lessons" || !profile) return [];
      if (record.childId && (!child || child.parentId !== record.userId))
         return [];
      return [
         {
            ...record,
            service,
            profile: { ...profile, email: profile.email ?? "" },
            child: child ?? null,
         },
      ];
   });
}

export function withoutInvoiceDuplicates<
   T extends { stripeOrderId?: string | null },
>(rows: T[], cash: CashSessionRegistration[]): T[] {
   const invoiceIds = new Set(cash.map((record) => record.invoiceId));
   return rows.filter(
      (row) => !row.stripeOrderId || !invoiceIds.has(row.stripeOrderId),
   );
}

export function cashSessionDetails(
   record: CashSessionRecord,
): CashSessionDetails {
   return {
      sessionAt: record.sessionAt,
      durationMinutes: record.durationMinutes,
      amountCents: record.amountCents,
      currency: record.currency,
   };
}
