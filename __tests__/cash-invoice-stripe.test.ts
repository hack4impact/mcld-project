/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const invoicesCreate = jest.fn();
const invoiceItemsCreate = jest.fn();
const finalizeInvoice = jest.fn();
const invoicesPay = jest.fn();
const constructEvent = jest.fn();

jest.mock("stripe", () =>
   jest.fn().mockImplementation(() => ({
      invoices: {
         create: (...a: unknown[]) => invoicesCreate(...a),
         finalizeInvoice: (...a: unknown[]) => finalizeInvoice(...a),
         pay: (...a: unknown[]) => invoicesPay(...a),
      },
      invoiceItems: { create: (...a: unknown[]) => invoiceItemsCreate(...a) },
      webhooks: { constructEvent: (...a: unknown[]) => constructEvent(...a) },
      subscriptions: { list: jest.fn() },
   })),
);

jest.mock("@/lib/db", () => ({ db: {} }));
jest.mock("next/cache", () => ({ cacheLife: jest.fn(), cacheTag: jest.fn() }));
jest.mock("@/app/private-lessons/notifications", () => ({
   sendCoordinatorBookingEmail: jest.fn(),
}));

import { recordOutOfBandInvoice } from "@/lib/stripe";
import { POST } from "@/app/api/webhooks/stripe/route";

beforeEach(() => {
   jest.clearAllMocks();
   invoicesCreate.mockResolvedValue({ id: "in_1" });
   invoiceItemsCreate.mockResolvedValue({ id: "ii_1" });
   finalizeInvoice.mockResolvedValue({ id: "in_1" });
   invoicesPay.mockResolvedValue({ id: "in_1", status: "paid" });
});

describe("recordOutOfBandInvoice", () => {
   it("creates, finalizes and pays the invoice out of band with idempotency keys", async () => {
      const id = await recordOutOfBandInvoice({
         customerId: "cus_1",
         productId: "prod_1",
         amountCents: 5000,
         currency: "cad",
         description: "Lesson — paid in cash",
         metadata: { type: "cash_private_lesson" },
         idempotencyKey: "cash-session:abc",
      });

      expect(id).toBe("in_1");
      expect(invoicesCreate).toHaveBeenCalledWith(
         expect.objectContaining({
            customer: "cus_1",
            auto_advance: false,
            pending_invoice_items_behavior: "exclude",
         }),
         { idempotencyKey: "cash-session:abc:invoice" },
      );
      expect(invoiceItemsCreate).toHaveBeenCalledWith(
         expect.objectContaining({
            invoice: "in_1",
            price_data: {
               currency: "cad",
               product: "prod_1",
               unit_amount: 5000,
            },
         }),
         { idempotencyKey: "cash-session:abc:item" },
      );
      expect(finalizeInvoice).toHaveBeenCalledWith(
         "in_1",
         { auto_advance: false },
         { idempotencyKey: "cash-session:abc:finalize" },
      );
      expect(invoicesPay).toHaveBeenCalledWith(
         "in_1",
         { paid_out_of_band: true },
         { idempotencyKey: "cash-session:abc:pay" },
      );
   });
});

describe("stripe webhook", () => {
   it("ignores invoice events for cash private lessons", async () => {
      constructEvent.mockReturnValue({
         type: "invoice.paid",
         data: {
            object: {
               customer: "cus_1",
               metadata: { type: "cash_private_lesson" },
            },
         },
      });
      const req = new NextRequest("http://localhost/api/webhooks/stripe", {
         method: "POST",
         body: "{}",
         headers: { "stripe-signature": "sig" },
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
   });
});
