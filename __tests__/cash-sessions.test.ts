/** @jest-environment node */
const invoicesList = jest.fn();
jest.mock("../lib/stripe", () => ({
   stripe: {
      invoices: { list: (...args: unknown[]) => invoicesList(...args) },
   },
}));
import { listCashSessions } from "../lib/cash-sessions";

const serviceId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const childId = "55555555-5555-4555-8555-555555555555";
const submissionId = "66666666-6666-4666-8666-666666666666";
const coordinatorId = "11111111-1111-4111-8111-111111111111";
const recordedBy = "22222222-2222-4222-8222-222222222222";
function receipt() {
   return {
      id: "in_cash",
      status: "paid",
      total: 5000,
      amount_paid: 5000,
      amount_remaining: 0,
      starting_balance: 0,
      ending_balance: 0,
      currency: "cad",
      description: "Reading — paid in cash",
      created: 1700000000,
      metadata: {
         type: "cash_private_lesson",
         schemaVersion: "1",
         submissionId,
         privateLessonSessionId: submissionId,
         serviceId,
         userId,
         childId: "",
         collectedBy: coordinatorId,
         recordedBy,
         sessionAt: "2026-01-01T12:00:00.000Z",
         collectedAt: "2026-01-01T13:00:00.000Z",
         durationMinutes: "90",
         cashAmountCents: "5000",
      },
   };
}

beforeEach(() => {
   jest.resetAllMocks();
   invoicesList.mockResolvedValue({ data: [receipt()], has_more: false });
});

it("reads complete cash attendance and payment details from the invoice", async () => {
   await expect(listCashSessions({ customerId: "cus_1" })).resolves.toEqual([
      {
         invoiceId: "in_cash",
         submissionId,
         serviceId,
         userId,
         childId: null,
         coordinatorId,
         recordedBy,
         sessionAt: new Date("2026-01-01T12:00:00Z"),
         collectedAt: new Date("2026-01-01T13:00:00Z"),
         durationMinutes: 90,
         amountCents: 5000,
         currency: "cad",
         title: "Reading",
         createdAt: new Date(1700000000000),
      },
   ]);
   expect(invoicesList).toHaveBeenCalledWith({
      status: "paid",
      limit: 100,
      customer: "cus_1",
   });
});

it("paginates list reads and filters by service without Stripe metadata search", async () => {
   const other = receipt();
   other.id = "in_other";
   other.metadata.serviceId = "99999999-9999-4999-8999-999999999999";
   const child = receipt();
   child.metadata.childId = childId;
   invoicesList
      .mockResolvedValueOnce({ data: [other], has_more: true })
      .mockResolvedValueOnce({ data: [child], has_more: false });
   const result = await listCashSessions({ serviceId });
   expect(result).toHaveLength(1);
   expect(result[0].childId).toBe(childId);
   expect(invoicesList).toHaveBeenLastCalledWith({
      status: "paid",
      limit: 100,
      starting_after: "in_other",
   });
});

it.each([
   { field: "userId", value: "" },
   { field: "sessionAt", value: "invalid" },
   { field: "collectedAt", value: "" },
   { field: "durationMinutes", value: "0" },
   { field: "durationMinutes", value: "1.5" },
   { field: "childId", value: "invalid" },
   { field: "cashAmountCents", value: "6000" },
   { field: "privateLessonSessionId", value: "mismatch" },
   { field: "schemaVersion", value: "99" },
])(
   "ignores incomplete or invalid metadata: $field=$value",
   async ({ field, value }) => {
      const invoice = receipt();
      Object.assign(invoice.metadata, { [field]: value });
      invoicesList.mockResolvedValue({ data: [invoice], has_more: false });
      await expect(listCashSessions()).resolves.toEqual([]);
   },
);

it.each([
   { status: "draft" },
   { status: "open" },
   { total: 0, amount_paid: 0 },
   { amount_paid: 4000 },
   { starting_balance: -1000 },
   { amount_remaining: 100 },
])(
   "ignores unpaid or financially inconsistent invoices: %j",
   async (change) => {
      invoicesList.mockResolvedValue({
         data: [{ ...receipt(), ...change }],
         has_more: false,
      });
      await expect(listCashSessions()).resolves.toEqual([]);
   },
);

it("leaves legacy cash invoices without user metadata to the existing DB fallback", async () => {
   invoicesList.mockResolvedValue({
      data: [
         {
            ...receipt(),
            metadata: {
               type: "cash_private_lesson",
               privateLessonSessionId: submissionId,
            },
         },
      ],
      has_more: false,
   });
   await expect(listCashSessions()).resolves.toEqual([]);
});

it("propagates Stripe failures rather than presenting an empty cash history", async () => {
   invoicesList.mockRejectedValue(new Error("Stripe unavailable"));
   await expect(listCashSessions()).rejects.toThrow("Stripe unavailable");
});
