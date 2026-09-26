/**
 * @jest-environment node
 */
import { startPrivateLessonCheckout } from "@/app/checkout/actions";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const SERVICE_ID = "22222222-2222-2222-2222-222222222222";
const COORDINATOR_ID = "33333333-3333-3333-3333-333333333333";
const SESSION_ID = "44444444-4444-4444-4444-444444444444";

const WINDOW = { start: "2026-10-01T14:00:00Z", end: "2026-10-01T15:00:00Z" };

const findService = jest.fn();
const findCoachingSession = jest.fn();

const insertReturning = jest.fn();
const insertValues = jest.fn(() => ({ returning: insertReturning }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

const updateWhere = jest.fn().mockResolvedValue(undefined);
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet })) as jest.Mock;

jest.mock("@/lib/db", () => ({
   db: {
      query: {
         services: {
            findFirst: (...args: unknown[]) => findService(...args),
         },
         coachingSessions: {
            findFirst: (...args: unknown[]) => findCoachingSession(...args),
         },
      },
      insert: (...args: unknown[]) => insert(...args),
      update: (...args: unknown[]) => update(...args),
      delete: jest.fn(),
   },
}));

const createCheckoutSession = jest.fn();
jest.mock("@/lib/stripe", () => ({
   getActiveCouponForCustomerProduct: jest.fn().mockResolvedValue(null),
   getOrCreateStripeCustomer: jest.fn().mockResolvedValue("cus_1"),
   stripe: {
      products: {
         retrieve: jest.fn().mockResolvedValue({ default_price: "price_1" }),
      },
      checkout: {
         sessions: {
            create: (...args: unknown[]) => createCheckoutSession(...args),
         },
      },
   },
}));

jest.mock("next/headers", () => ({
   headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));

const getUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser } }),
}));

function privateLesson(isScheduled: boolean) {
   return {
      id: SERVICE_ID,
      type: "private_lessons",
      status: "active",
      coordinatorId: COORDINATOR_ID,
      stripeProductId: "prod_1",
      isScheduled,
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "client@example.com" } },
   });
   insertReturning.mockResolvedValue([{ id: SESSION_ID }]);
   findCoachingSession.mockResolvedValue({
      id: SESSION_ID,
      serviceId: SERVICE_ID,
      status: "awaiting_payment",
   });
   createCheckoutSession.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/cs_test_1",
   });
});

describe("startPrivateLessonCheckout — non-scheduled lesson", () => {
   beforeEach(() => {
      findService.mockResolvedValue(privateLesson(false));
   });

   it("creates a session with no time windows and redirects to payment", async () => {
      const result = await startPrivateLessonCheckout({
         serviceId: SERVICE_ID,
      });

      expect(result).toEqual({
         url: "https://checkout.stripe.com/c/cs_test_1",
      });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            serviceId: SERVICE_ID,
            coordinatorId: COORDINATOR_ID,
            selectedTimeSlots: null,
            status: "awaiting_payment",
         }),
      );
      expect(insertValues).toHaveBeenCalledWith(
         expect.not.objectContaining({ scheduledAt: expect.anything() }),
      );
      expect(createCheckoutSession).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: { type: "private_lesson", coachingSessionId: SESSION_ID },
         }),
      );
   });

   it("ignores windows sent for a non-scheduled lesson", async () => {
      await startPrivateLessonCheckout({
         serviceId: SERVICE_ID,
         availabilities: [WINDOW],
      });

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ selectedTimeSlots: null }),
      );
   });
});

describe("startPrivateLessonCheckout — scheduled lesson", () => {
   beforeEach(() => {
      findService.mockResolvedValue(privateLesson(true));
   });

   it("still requires at least one availability window", async () => {
      const result = await startPrivateLessonCheckout({
         serviceId: SERVICE_ID,
      });

      expect(result).toEqual({
         error: "At least one availability window is required",
      });
      expect(insert).not.toHaveBeenCalled();
      expect(createCheckoutSession).not.toHaveBeenCalled();
   });

   it("stores the customer's windows", async () => {
      const result = await startPrivateLessonCheckout({
         serviceId: SERVICE_ID,
         availabilities: [WINDOW],
      });

      expect(result).toEqual({
         url: "https://checkout.stripe.com/c/cs_test_1",
      });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ selectedTimeSlots: [WINDOW] }),
      );
   });
});
