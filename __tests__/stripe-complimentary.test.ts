/**
 * @jest-environment node
 */
import { grantComplimentarySubscription } from "@/lib/stripe";

const subscriptionsList = jest.fn();
const subscriptionsCreate = jest.fn();
const subscriptionsUpdate = jest.fn();
jest.mock("stripe", () =>
   jest.fn(() => ({
      subscriptions: {
         list: (...args: unknown[]) => subscriptionsList(...args),
         create: (...args: unknown[]) => subscriptionsCreate(...args),
         update: (...args: unknown[]) => subscriptionsUpdate(...args),
      },
      customers: { create: jest.fn() },
   })),
);

jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: jest
               .fn()
               .mockResolvedValue({ id: "u1", stripeCustomerId: "cus_1" }),
         },
      },
      insert: () => ({
         values: () => ({ onConflictDoUpdate: async () => undefined }),
      }),
   },
}));

jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

const originalPriceId = process.env.STRIPE_PRICE_ID;
beforeAll(() => {
   process.env.STRIPE_PRICE_ID = "price_platform";
});
afterAll(() => {
   if (originalPriceId === undefined) delete process.env.STRIPE_PRICE_ID;
   else process.env.STRIPE_PRICE_ID = originalPriceId;
});

beforeEach(() => {
   jest.clearAllMocks();
   subscriptionsList.mockResolvedValue({ data: [] });
   subscriptionsCreate.mockResolvedValue({ id: "sub_new" });
});

describe("grantComplimentarySubscription", () => {
   it.each(["trialing", "active", "past_due", "unpaid"])(
      "extends a %s subscription instead of adding a second one",
      async (status) => {
         subscriptionsList.mockResolvedValueOnce({
            data: [{ id: "sub_live", status, trial_end: null }],
         });

         await grantComplimentarySubscription("u1", "ada@example.com", 3);

         expect(subscriptionsCreate).not.toHaveBeenCalled();
         expect(subscriptionsUpdate).toHaveBeenCalledWith(
            "sub_live",
            expect.objectContaining({ trial_end: expect.any(Number) }),
         );
      },
   );

   it("adds one when the customer only has ended subscriptions", async () => {
      subscriptionsList.mockResolvedValueOnce({
         data: [{ status: "canceled" }, { status: "incomplete_expired" }],
      });

      await grantComplimentarySubscription("u1", "ada@example.com", 3);

      expect(subscriptionsCreate).toHaveBeenCalledTimes(1);
      expect(subscriptionsCreate).toHaveBeenCalledWith(
         expect.objectContaining({
            customer: "cus_1",
            items: [{ price: "price_platform" }],
         }),
      );
   });

   it("does nothing for zero months", async () => {
      await grantComplimentarySubscription("u1", "ada@example.com", 0);

      expect(subscriptionsList).not.toHaveBeenCalled();
      expect(subscriptionsCreate).not.toHaveBeenCalled();
   });
});
