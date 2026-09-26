/**
 * @jest-environment node
 */
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/webhooks/stripe/route";

const constructEvent = jest.fn();
const syncStripeData = jest.fn();
jest.mock("@/lib/stripe", () => ({
   stripe: {
      webhooks: {
         constructEvent: (...args: unknown[]) => constructEvent(...args),
      },
   },
   syncStripeData: (...args: unknown[]) => syncStripeData(...args),
   deleteCouponIfExhausted: jest.fn(),
}));

const updateReturning = jest.fn();
const updateWhere = jest.fn(() => {
   const result = Promise.resolve(undefined);
   return Object.assign(result, { returning: updateReturning });
});
const updateSet = jest.fn<
   { where: typeof updateWhere },
   [Record<string, unknown>]
>(() => ({ where: updateWhere }));
jest.mock("@/lib/db", () => ({
   db: { update: () => ({ set: updateSet }) },
}));

const sendCoordinatorBookingEmail = jest.fn();
jest.mock("@/app/private-lessons/notifications", () => ({
   sendCoordinatorBookingEmail: (...args: unknown[]) =>
      sendCoordinatorBookingEmail(...args),
}));

function request(): NextRequest {
   return new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "sig" },
   }) as unknown as NextRequest;
}

function event(type: string, metadata: Record<string, string>) {
   return {
      type,
      data: { object: { id: "cs_test_1", metadata, customer: "cus_1" } },
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   updateReturning.mockResolvedValue([{ id: "session-1" }]);
});

describe("checkout.session.expired", () => {
   it("cancels the unpaid private lesson so its slot is released", async () => {
      constructEvent.mockReturnValue(
         event("checkout.session.expired", {
            type: "private_lesson",
            privateLessonSessionId: "session-1",
         }),
      );

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ status: "cancelled" }),
      );
      expect(updateWhere).toHaveBeenCalled();
      expect(syncStripeData).not.toHaveBeenCalled();
   });

   it("ignores expired sessions that aren't private lessons", async () => {
      constructEvent.mockReturnValue(
         event("checkout.session.expired", { type: "program", bookingId: "b" }),
      );

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(updateSet).not.toHaveBeenCalled();
   });
});

describe("checkout.session.completed", () => {
   it("confirms a scheduled lesson and emails the coordinator", async () => {
      constructEvent.mockReturnValue(
         event("checkout.session.completed", {
            type: "private_lesson",
            privateLessonSessionId: "session-1",
         }),
      );

      await POST(request());

      // Status is decided in SQL: confirmed when scheduled_at is set,
      // otherwise pending.
      const values = updateSet.mock.calls[0]![0];
      expect(typeof values.status).toBe("object");
      expect(values.stripeOrderId).toBe("cs_test_1");
      expect(sendCoordinatorBookingEmail).toHaveBeenCalledWith("session-1");
   });

   it("doesn't email twice when the session was already processed", async () => {
      updateReturning.mockResolvedValue([]);
      constructEvent.mockReturnValue(
         event("checkout.session.completed", {
            type: "private_lesson",
            privateLessonSessionId: "session-1",
         }),
      );

      await POST(request());

      expect(sendCoordinatorBookingEmail).not.toHaveBeenCalled();
   });
});
