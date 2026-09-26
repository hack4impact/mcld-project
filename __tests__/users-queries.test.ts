/**
 * @jest-environment node
 */
import {
   listReadOnlyUsers,
   listUsersWithEmails,
} from "@/app/(authenticated)/users/queries";

const dbRow = {
   id: "u1",
   firstName: "Ada",
   lastName: "Lovelace",
   role: "user",
   lastLoginAt: new Date("2026-09-01T00:00:00Z"),
   subscriptionStatus: "active",
   email: "ada@example.com",
   stripeCustomerId: "cus_123",
};

const selectedFields: Record<string, unknown>[] = [];

jest.mock("@/lib/db", () => ({
   db: {
      select: (fields: Record<string, unknown>) => {
         selectedFields.push(fields);
         const chain = {
            from: () => chain,
            innerJoin: () => chain,
            // Returns the Stripe id too, as a stale or careless query would.
            leftJoin: () => Promise.resolve([dbRow]),
         };
         return chain;
      },
   },
}));

beforeEach(() => {
   selectedFields.length = 0;
});

describe("listReadOnlyUsers", () => {
   it("never selects the Stripe customer id", async () => {
      await listReadOnlyUsers();
      expect(Object.keys(selectedFields[0]!)).not.toContain(
         "stripeCustomerId",
      );
   });

   it("only returns allow-listed fields", async () => {
      const [user] = await listReadOnlyUsers();
      expect(user).toEqual({
         id: "u1",
         firstName: "Ada",
         lastName: "Lovelace",
         role: "user",
         lastLoginAt: dbRow.lastLoginAt,
         email: "ada@example.com",
         isActive: true,
      });
   });
});

describe("listUsersWithEmails", () => {
   it("includes the Stripe customer id for admins", async () => {
      const [user] = await listUsersWithEmails();
      expect(Object.keys(selectedFields[0]!)).toContain("stripeCustomerId");
      expect(user?.stripeCustomerId).toBe("cus_123");
   });
});
