/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { revalidateTag } from "next/cache";
import { POST } from "@/app/api/webhooks/stripe/route";
import { coachingSessions } from "@/lib/db/schema";
import { sendCoordinatorBookingEmail } from "@/app/coaching/notifications";

const returning = jest.fn();
const where = jest.fn(() => ({ returning })) as jest.Mock;
const set = jest.fn(() => ({ where }));
const update = jest.fn(() => ({ set })) as jest.Mock;
const constructEvent = jest.fn();

jest.mock("@/lib/db", () => ({
   db: { update: (...args: unknown[]) => update(...args) },
}));
jest.mock("@/lib/stripe", () => ({
   stripe: {
      webhooks: {
         constructEvent: (...args: unknown[]) => constructEvent(...args),
      },
   },
}));
jest.mock("@/app/coaching/notifications", () => ({
   sendCoordinatorBookingEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

const sessionId = "11111111-1111-1111-1111-111111111111";
const checkout = {
   id: "cs_lesson",
   mode: "payment",
   payment_status: "paid",
   metadata: { type: "private_lesson", coachingSessionId: sessionId },
};

function request(signature = "test-signature") {
   return new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: signature ? { "stripe-signature": signature } : {},
      body: "signed payload",
   });
}

beforeEach(() => {
   jest.clearAllMocks();
   constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: checkout },
   });
   returning.mockResolvedValue([{ id: sessionId }]);
});

describe("coaching checkout webhook", () => {
   it("confirms the registration and refreshes it after completed checkout", async () => {
      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(update).toHaveBeenCalledWith(coachingSessions);
      expect(set).toHaveBeenCalledWith({
         status: "confirmed",
         stripeOrderId: checkout.id,
      });
      const predicate = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
      expect(predicate.sql).toBe(
         '("coaching_sessions"."id" = $1 and "coaching_sessions"."status" = $2)',
      );
      expect(predicate.params).toEqual([sessionId, "awaiting_payment"]);
      expect(revalidateTag).toHaveBeenCalledWith("services", { expire: 0 });
      expect(sendCoordinatorBookingEmail).toHaveBeenCalledWith(sessionId);
   });

   it("does not send another email when a retry updates no awaiting-payment row", async () => {
      returning
         .mockResolvedValueOnce([{ id: sessionId }])
         .mockResolvedValueOnce([]);

      await POST(request());
      await POST(request());

      expect(sendCoordinatorBookingEmail).toHaveBeenCalledTimes(1);
   });

   it("does not notify when the session has already been cancelled or completed", async () => {
      returning.mockResolvedValue([]);

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(sendCoordinatorBookingEmail).not.toHaveBeenCalled();
   });

   it("leaves unfinished checkout events untouched", async () => {
      constructEvent.mockReturnValue({
         type: "checkout.session.expired",
         data: { object: { ...checkout, payment_status: "unpaid" } },
      });

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(update).not.toHaveBeenCalled();
      expect(sendCoordinatorBookingEmail).not.toHaveBeenCalled();
   });

   it("rejects a request without a Stripe signature", async () => {
      const response = await POST(request(""));

      expect(response.status).toBe(400);
      expect(constructEvent).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
   });
});
