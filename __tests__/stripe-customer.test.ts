/** @jest-environment node */
const profileLookup = jest.fn();
const updateReturning = jest.fn();
const updateWhere = jest.fn(() => ({ returning: updateReturning }));
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet }));
const customerCreate = jest.fn();

jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: (...args: unknown[]) => profileLookup(...args),
         },
      },
      update: (...args: unknown[]) => update(...(args as [])),
   },
}));
jest.mock("@/lib/db/schema", () => ({
   profiles: { id: "profile_id", stripeCustomerId: "stripe_customer_id" },
   subscriptions: {},
}));
jest.mock("drizzle-orm", () => ({
   eq: (column: string, value: unknown) => ({ eq: [column, value] }),
   isNull: (column: string) => ({ isNull: column }),
   and: (...conditions: unknown[]) => ({ and: conditions }),
}));
jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));
jest.mock("stripe", () =>
   jest.fn().mockImplementation(() => ({
      customers: { create: (...args: unknown[]) => customerCreate(...args) },
   })),
);

import { getOrCreateStripeCustomer } from "../lib/stripe";

const userId = "44444444-4444-4444-4444-444444444444";
const email = "client@example.com";
const emptyProfile = { id: userId, stripeCustomerId: null };

beforeEach(() => {
   jest.clearAllMocks();
   profileLookup.mockReset().mockResolvedValue(emptyProfile);
   customerCreate.mockReset().mockResolvedValue({ id: "cus_stable" });
   updateReturning
      .mockReset()
      .mockResolvedValue([{ stripeCustomerId: "cus_stable" }]);
});

it("returns an existing canonical customer without creating or replacing it", async () => {
   profileLookup.mockResolvedValue({ stripeCustomerId: "cus_existing" });
   await expect(getOrCreateStripeCustomer(userId, email)).resolves.toBe(
      "cus_existing",
   );
   expect(customerCreate).not.toHaveBeenCalled();
   expect(update).not.toHaveBeenCalled();
});

it("uses a stable user-specific creation key and only claims an unlinked profile", async () => {
   await expect(getOrCreateStripeCustomer(userId, email)).resolves.toBe(
      "cus_stable",
   );
   expect(customerCreate).toHaveBeenCalledWith(
      { email, metadata: { userId } },
      { idempotencyKey: `mcld-customer:${userId}` },
   );
   expect(updateWhere).toHaveBeenCalledWith({
      and: [{ eq: ["profile_id", userId] }, { isNull: "stripe_customer_id" }],
   });
});

it("returns the winner if another request already linked a different customer", async () => {
   profileLookup
      .mockResolvedValueOnce(emptyProfile)
      .mockResolvedValueOnce({ stripeCustomerId: "cus_winner" });
   updateReturning.mockResolvedValue([]);
   await expect(getOrCreateStripeCustomer(userId, email)).resolves.toBe(
      "cus_winner",
   );
   expect(update).toHaveBeenCalledTimes(1);
   expect(profileLookup).toHaveBeenCalledTimes(2);
});

it("concurrent first requests use one key and both return the canonical mapping", async () => {
   let canonical: string | null = null;
   profileLookup
      .mockResolvedValueOnce(emptyProfile)
      .mockResolvedValueOnce(emptyProfile)
      .mockImplementation(async () => ({ stripeCustomerId: canonical }));
   updateReturning.mockImplementation(async () => {
      if (canonical) return [];
      canonical = "cus_stable";
      return [{ stripeCustomerId: canonical }];
   });
   await expect(
      Promise.all([
         getOrCreateStripeCustomer(userId, email),
         getOrCreateStripeCustomer(userId, email),
      ]),
   ).resolves.toEqual(["cus_stable", "cus_stable"]);
   expect(customerCreate).toHaveBeenCalledTimes(2);
   expect(customerCreate.mock.calls[0]).toEqual(customerCreate.mock.calls[1]);
});

it("does not create a Stripe customer for a missing profile", async () => {
   profileLookup.mockResolvedValue(undefined);
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "Client profile not found",
   );
   expect(customerCreate).not.toHaveBeenCalled();
});

it("does not create a Stripe customer when the profile lookup fails", async () => {
   profileLookup.mockRejectedValue(new Error("database unavailable"));
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "database unavailable",
   );
   expect(customerCreate).not.toHaveBeenCalled();
});

it("does not return an unlinked customer if the profile disappears during creation", async () => {
   profileLookup
      .mockResolvedValueOnce(emptyProfile)
      .mockResolvedValueOnce(undefined);
   updateReturning.mockResolvedValue([]);
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "Could not link",
   );
});

it("does not return an unlinked customer when the canonical reread fails", async () => {
   profileLookup
      .mockResolvedValueOnce(emptyProfile)
      .mockRejectedValueOnce(new Error("database unavailable"));
   updateReturning.mockResolvedValue([]);
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "database unavailable",
   );
});

it("reuses the same Stripe creation key when the initial DB link fails", async () => {
   updateReturning.mockRejectedValueOnce(new Error("database update failed"));
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "database update failed",
   );
   await expect(getOrCreateStripeCustomer(userId, email)).resolves.toBe(
      "cus_stable",
   );
   expect(customerCreate.mock.calls[0]).toEqual(customerCreate.mock.calls[1]);
});

it("finds an already-linked customer after the DB response was lost", async () => {
   updateReturning.mockRejectedValueOnce(new Error("DB response lost"));
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "DB response lost",
   );
   profileLookup.mockResolvedValue({ stripeCustomerId: "cus_stable" });
   await expect(getOrCreateStripeCustomer(userId, email)).resolves.toBe(
      "cus_stable",
   );
   expect(customerCreate).toHaveBeenCalledTimes(1);
});

it("does not link anything when Stripe creation fails", async () => {
   customerCreate.mockRejectedValue(new Error("Stripe unavailable"));
   await expect(getOrCreateStripeCustomer(userId, email)).rejects.toThrow(
      "Stripe unavailable",
   );
   expect(update).not.toHaveBeenCalled();
});
