/**
 * @jest-environment node
 */
import { checkoutDonation } from "./actions";

const createSession = jest.fn();
const retrieveProduct = jest.fn();
const retrievePrice = jest.fn();
const getUser = jest.fn();
const getOrCreateStripeCustomer = jest.fn();
const headersGet = jest.fn();

jest.mock("@/lib/stripe", () => ({
   stripe: {
      checkout: { sessions: { create: (...args: unknown[]) => createSession(...args) } },
      products: { retrieve: (...args: unknown[]) => retrieveProduct(...args) },
      prices: { retrieve: (...args: unknown[]) => retrievePrice(...args) },
   },
   getOrCreateStripeCustomer: (...args: unknown[]) =>
      getOrCreateStripeCustomer(...args),
}));

jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser } }),
}));

jest.mock("next/headers", () => ({
   headers: async () => ({ get: (...args: unknown[]) => headersGet(...args) }),
}));

const authedUser = {
   data: { user: { id: "user-1", email: "donor@test.com" } },
};

beforeEach(() => {
   jest.clearAllMocks();
   process.env.STRIPE_DONATION_PRODUCT_ID = "prod_test123";
   getUser.mockResolvedValue(authedUser);
   getOrCreateStripeCustomer.mockResolvedValue("cus_123");
   retrieveProduct.mockResolvedValue({ default_price: "price_donation" });
   retrievePrice.mockResolvedValue({ custom_unit_amount: { preset: 1000 } });
   createSession.mockResolvedValue({ url: "https://stripe.test/session" });
   headersGet.mockReturnValue("https://app.test");
});

describe("checkoutDonation", () => {
   it("requires an authenticated user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      const result = await checkoutDonation();
      expect(result).toEqual({ error: "Not authenticated" });
      expect(createSession).not.toHaveBeenCalled();
   });

   it("returns an error when the donation product env var is not set", async () => {
      delete process.env.STRIPE_DONATION_PRODUCT_ID;
      const result = await checkoutDonation();
      expect(result).toEqual({ error: "Donation product not configured" });
      expect(createSession).not.toHaveBeenCalled();
   });

   it("creates a checkout session using the donation product's default price", async () => {
      const result = await checkoutDonation();

      expect(retrieveProduct).toHaveBeenCalledWith("prod_test123");
      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith(
         "user-1",
         "donor@test.com",
      );
      expect(createSession).toHaveBeenCalledWith(
         expect.objectContaining({
            customer: "cus_123",
            mode: "payment",
            metadata: { type: "donation" },
            line_items: [{ price: "price_donation", quantity: 1 }],
         }),
      );
      expect(result).toEqual({ url: "https://stripe.test/session" });
   });

   it("derives success/cancel URLs from the request origin", async () => {
      await checkoutDonation();
      expect(createSession).toHaveBeenCalledWith(
         expect.objectContaining({
            success_url: "https://app.test/checkout/success",
            cancel_url: "https://app.test/checkout/cancel",
         }),
      );
   });

   it("returns an error when Stripe omits the checkout URL", async () => {
      createSession.mockResolvedValue({ url: null });
      const result = await checkoutDonation();
      expect(result).toEqual({ error: "Stripe did not return a checkout URL" });
   });

   it("throws when the request origin is missing", async () => {
      headersGet.mockReturnValue(null);
      await expect(checkoutDonation()).rejects.toThrow(
         "Missing request origin",
      );
      expect(createSession).not.toHaveBeenCalled();
   });
});
