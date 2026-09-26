/** @jest-environment node */
import { NextRequest } from "next/server";

const invoicesList = jest.fn();
const invoicesRetrieve = jest.fn();
const invoicesCreate = jest.fn();
const invoiceItemsCreate = jest.fn();
const listLineItems = jest.fn();
const finalizeInvoice = jest.fn();
const invoicesPay = jest.fn();
const constructEvent = jest.fn();

jest.mock("stripe", () =>
   jest.fn().mockImplementation(() => ({
      invoices: {
         list: (...a: unknown[]) => invoicesList(...a),
         retrieve: (...a: unknown[]) => invoicesRetrieve(...a),
         create: (...a: unknown[]) => invoicesCreate(...a),
         listLineItems: (...a: unknown[]) => listLineItems(...a),
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

import { CashInvoiceReviewError, recordOutOfBandInvoice } from "../lib/stripe";
import { POST } from "@/app/api/webhooks/stripe/route";

const input = {
   customerId: "cus_1",
   productId: "prod_1",
   amountCents: 5000,
   currency: "cad",
   description: "Lesson — paid in cash",
   metadata: {
      type: "cash_private_lesson",
      submissionId: "66666666-6666-4666-8666-666666666666",
      privateLessonSessionId: "66666666-6666-4666-8666-666666666666",
      userId: "44444444-4444-4444-4444-444444444444",
      childId: "",
   },
   idempotencyKey: "cash-session:66666666-6666-4666-8666-666666666666",
};

function draft(metadata: Record<string, string>) {
   return {
      id: "in_1",
      customer: "cus_1",
      status: "draft",
      currency: "cad",
      description: input.description,
      metadata,
      total: 0,
      amount_due: 0,
      amount_paid: 0,
      amount_remaining: 0,
      starting_balance: 0,
      ending_balance: 0,
   };
}
let current: ReturnType<typeof draft> | null;
let lines: {
   id: string;
   amount: number;
   currency: string;
   metadata: Record<string, string>;
   pricing: { price_details: { product: string } };
}[];

beforeEach(() => {
   jest.resetAllMocks();
   current = null;
   lines = [];
   invoicesList.mockImplementation(async () => ({
      data: current ? [{ ...current }] : [],
      has_more: false,
   }));
   invoicesRetrieve.mockImplementation(async () => ({ ...current! }));
   invoicesCreate.mockImplementation(async ({ metadata }) => {
      // Model Stripe's stable-key create: concurrent callers get the same invoice.
      current ??= draft(
         Object.fromEntries(
            Object.entries(metadata).filter(([, value]) => value !== ""),
         ) as Record<string, string>,
      );
      return { ...current };
   });
   listLineItems.mockImplementation(async () => ({
      data: [...lines],
      has_more: false,
   }));
   invoiceItemsCreate.mockImplementation(async ({ metadata, price_data }) => {
      if (!lines.length)
         lines.push({
            id: "il_1",
            amount: price_data.unit_amount,
            currency: price_data.currency,
            metadata,
            pricing: { price_details: { product: price_data.product } },
         });
      current!.total = 5000;
      current!.amount_due = 5000;
      current!.amount_remaining = 5000;
      return { id: "ii_1" };
   });
   finalizeInvoice.mockImplementation(async () => {
      current!.status = "open";
      return { ...current! };
   });
   invoicesPay.mockImplementation(async () => {
      current!.status = "paid";
      current!.amount_paid = 5000;
      current!.amount_remaining = 0;
      return { ...current! };
   });
});

describe("recordOutOfBandInvoice", () => {
   it("creates and pays one exact cash receipt with stable step keys and no inherited discount", async () => {
      await expect(recordOutOfBandInvoice(input)).resolves.toBe("in_1");
      expect(invoicesCreate).toHaveBeenCalledWith(
         expect.objectContaining({
            customer: "cus_1",
            currency: "cad",
            auto_advance: false,
            pending_invoice_items_behavior: "exclude",
            discounts: "",
            metadata: expect.objectContaining({
               cashAmountCents: "5000",
               cashProductId: "prod_1",
               cashPayloadHash: expect.any(String),
            }),
         }),
         { idempotencyKey: `${input.idempotencyKey}:invoice` },
      );
      expect(invoiceItemsCreate).toHaveBeenCalledWith(
         expect.objectContaining({
            invoice: "in_1",
            discountable: false,
            price_data: {
               currency: "cad",
               product: "prod_1",
               unit_amount: 5000,
            },
         }),
         { idempotencyKey: `${input.idempotencyKey}:item` },
      );
      expect(invoicesPay).toHaveBeenCalledWith(
         "in_1",
         { paid_out_of_band: true },
         { idempotencyKey: `${input.idempotencyKey}:pay` },
      );
      expect(lines).toHaveLength(1);
   });

   it("returns an already-paid matching receipt after a lost response without new writes", async () => {
      await recordOutOfBandInvoice(input);
      jest.clearAllMocks();
      await expect(recordOutOfBandInvoice(input)).resolves.toBe("in_1");
      expect(invoicesCreate).not.toHaveBeenCalled();
      expect(invoiceItemsCreate).not.toHaveBeenCalled();
      expect(finalizeInvoice).not.toHaveBeenCalled();
      expect(invoicesPay).not.toHaveBeenCalled();
   });

   it("recovers a payment whose successful response was lost", async () => {
      invoicesPay.mockImplementationOnce(async () => {
         current!.status = "paid";
         current!.amount_paid = 5000;
         current!.amount_remaining = 0;
         throw new Error("connection lost after payment");
      });
      await expect(recordOutOfBandInvoice(input)).resolves.toBe("in_1");
      expect(lines).toHaveLength(1);
   });

   it("resumes an open invoice after payment failure without another invoice or item", async () => {
      invoicesPay.mockRejectedValueOnce(
         new Error("Stripe temporarily unavailable"),
      );
      await expect(recordOutOfBandInvoice(input)).rejects.toThrow(
         "temporarily unavailable",
      );
      expect(current!.status).toBe("open");
      await expect(recordOutOfBandInvoice(input)).resolves.toBe("in_1");
      expect(invoicesCreate).toHaveBeenCalledTimes(1);
      expect(invoiceItemsCreate).toHaveBeenCalledTimes(1);
      expect(finalizeInvoice).toHaveBeenCalledTimes(1);
   });

   it("resumes an existing draft after the idempotency retention window", async () => {
      finalizeInvoice.mockRejectedValueOnce(new Error("network unavailable"));
      await expect(recordOutOfBandInvoice(input)).rejects.toThrow(
         "network unavailable",
      );
      await expect(
         recordOutOfBandInvoice({
            ...input,
            submittedAt: Date.now() - 48 * 60 * 60_000,
         }),
      ).resolves.toBe("in_1");
      expect(invoicesCreate).toHaveBeenCalledTimes(1);
      expect(invoiceItemsCreate).toHaveBeenCalledTimes(1);
   });

   it("refuses blind creation for an old submission with no known receipt", async () => {
      await expect(
         recordOutOfBandInvoice({
            ...input,
            submittedAt: Date.now() - 23 * 60 * 60_000,
         }),
      ).rejects.toBeInstanceOf(CashInvoiceReviewError);
      expect(invoicesCreate).not.toHaveBeenCalled();
   });

   it.each([
      { amountCents: 6000 },
      { metadata: { ...input.metadata, userId: "changed_user" } },
      { description: "Changed title" },
   ])("rejects changed input under the same submission", async (change) => {
      await recordOutOfBandInvoice(input);
      jest.clearAllMocks();
      await expect(
         recordOutOfBandInvoice({ ...input, ...change }),
      ).rejects.toBeInstanceOf(CashInvoiceReviewError);
      expect(invoicesCreate).not.toHaveBeenCalled();
      expect(invoicesPay).not.toHaveBeenCalled();
   });

   it("requires review when stored metadata was changed in Stripe", async () => {
      await recordOutOfBandInvoice(input);
      current!.metadata.userId = "changed_user";
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
   });

   it("scans subsequent list pages to resume a known invoice", async () => {
      await recordOutOfBandInvoice(input);
      invoicesList.mockResolvedValueOnce({
         data: [{ id: "in_other", metadata: {} }],
         has_more: true,
      });
      await expect(recordOutOfBandInvoice(input)).resolves.toBe("in_1");
      expect(invoicesList).toHaveBeenLastCalledWith({
         customer: "cus_1",
         limit: 100,
         starting_after: "in_other",
      });
      expect(invoicesCreate).toHaveBeenCalledTimes(1);
   });

   it("refuses duplicate invoices for one submission", async () => {
      await recordOutOfBandInvoice(input);
      invoicesList.mockResolvedValueOnce({
         data: [current, { ...current, id: "in_duplicate" }],
         has_more: false,
      });
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
   });

   it("uses the same step keys when two submissions overlap", async () => {
      await expect(
         Promise.all([
            recordOutOfBandInvoice(input),
            recordOutOfBandInvoice(input),
         ]),
      ).resolves.toEqual(["in_1", "in_1"]);
      expect(lines).toHaveLength(1);
      for (const [, options] of invoicesCreate.mock.calls)
         expect(options.idempotencyKey).toBe(`${input.idempotencyKey}:invoice`);
      for (const [, options] of invoiceItemsCreate.mock.calls)
         expect(options.idempotencyKey).toBe(`${input.idempotencyKey}:item`);
      for (const [, , options] of invoicesPay.mock.calls)
         expect(options.idempotencyKey).toBe(`${input.idempotencyKey}:pay`);
   });

   it("does not finalize a draft that would consume customer credit", async () => {
      invoicesRetrieve.mockImplementation(async () => ({
         ...current!,
         starting_balance: -1000,
         amount_due: 4000,
      }));
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
      expect(finalizeInvoice).not.toHaveBeenCalled();
      expect(invoicesPay).not.toHaveBeenCalled();
   });

   it("does not finalize a draft whose amount due differs from cash collected", async () => {
      invoicesRetrieve.mockImplementation(async () => ({
         ...current!,
         amount_due: 0,
      }));
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
      expect(finalizeInvoice).not.toHaveBeenCalled();
      expect(invoicesPay).not.toHaveBeenCalled();
   });

   it("requires review rather than calling pay when finalization consumes customer credit", async () => {
      finalizeInvoice.mockImplementationOnce(async () => {
         Object.assign(current!, {
            status: "paid",
            amount_paid: 0,
            amount_remaining: 0,
            starting_balance: -5000,
         });
         return { ...current! };
      });
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
      expect(invoicesPay).not.toHaveBeenCalled();
   });

   it("does not add another line to a receipt that was edited in Stripe", async () => {
      invoicesPay.mockRejectedValueOnce(new Error("network unavailable"));
      await expect(recordOutOfBandInvoice(input)).rejects.toThrow();
      lines.push({ ...lines[0], id: "il_unrelated" });
      await expect(recordOutOfBandInvoice(input)).rejects.toBeInstanceOf(
         CashInvoiceReviewError,
      );
      expect(invoiceItemsCreate).toHaveBeenCalledTimes(1);
   });
});

describe("cash invoice webhook", () => {
   it("does not synchronize subscriptions for a cash invoice event", async () => {
      constructEvent.mockReturnValue({
         type: "invoice.paid",
         data: {
            object: {
               customer: "cus_1",
               metadata: { type: "cash_private_lesson" },
            },
         },
      });
      const request = new NextRequest("http://localhost/api/webhooks/stripe", {
         method: "POST",
         body: "{}",
         headers: { "stripe-signature": "sig" },
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
   });
});
