/** @jest-environment node */
import {
   recordCashSession,
   fetchCashSessionClients,
} from "@/app/(authenticated)/services/actions";
import { CashInvoiceReviewError } from "@/lib/stripe";

const selectLimit = jest.fn();
const select = jest.fn(() => ({
   from: () => ({ where: () => ({ limit: selectLimit }) }),
}));
// These deliberately throw: recording a cash invoice must never need a local
// attendance write, even after Stripe has successfully marked the invoice paid.
const mutation = jest.fn(() => {
   throw new Error("Unexpected local session mutation");
});
jest.mock("@/lib/db", () => ({
   db: {
      select: () => select(),
      insert: () => mutation(),
      update: () => mutation(),
      delete: () => mutation(),
   },
}));
const getStripeServiceData = jest.fn();
const getOrCreateStripeCustomer = jest.fn();
const recordOutOfBandInvoice = jest.fn();
jest.mock("@/lib/stripe", () => ({
   CashInvoiceReviewError: class CashInvoiceReviewError extends Error {},
   getStripeServiceData: (...args: unknown[]) => getStripeServiceData(...args),
   getOrCreateStripeCustomer: (...args: unknown[]) =>
      getOrCreateStripeCustomer(...args),
   recordOutOfBandInvoice: (...args: unknown[]) =>
      recordOutOfBandInvoice(...args),
}));
const isServiceCoordinator = jest.fn();
const listCashSessionClients = jest.fn();
jest.mock("@/app/(authenticated)/services/queries", () => ({
   isServiceCoordinator: (...args: unknown[]) => isServiceCoordinator(...args),
   listCashSessionClients: (...args: unknown[]) =>
      listCashSessionClients(...args),
   listServiceRegistrations: jest.fn(),
}));
const getUserRole = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   getUserRole: () => getUserRole(),
   requireAdmin: jest.fn(),
}));
const getUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));
jest.mock("next/cache", () => ({
   revalidatePath: jest.fn(),
   updateTag: jest.fn(),
   cacheTag: jest.fn(),
}));

const COACH = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const SERVICE = "33333333-3333-4333-8333-333333333333";
const CLIENT = "44444444-4444-4444-8444-444444444444";
const CHILD = "55555555-5555-4555-8555-555555555555";
const SUBMISSION = "66666666-6666-4666-8666-666666666666";
const service = {
   id: SERVICE,
   type: "private_lessons",
   status: "active",
   coordinatorId: COACH,
   isForChildren: false,
   stripeProductId: "prod_1",
};
const client = {
   id: CLIENT,
   firstName: "Pat",
   lastName: "Parent",
   email: "pat@example.com",
   children: [{ id: CHILD, firstName: "Kid", lastName: "Parent" }],
};
function form(overrides: Record<string, string> = {}) {
   const fields = {
      submission_id: SUBMISSION,
      submitted_at: new Date().toISOString(),
      service_id: SERVICE,
      user_id: CLIENT,
      session_at: "2026-01-01T16:00:00.000Z",
      collected_at: "2026-01-01T17:00:00.000Z",
      duration_minutes: "90",
      amount: "50.00",
      ...overrides,
   };
   const data = new FormData();
   for (const [key, value] of Object.entries(fields)) data.set(key, value);
   return data;
}
beforeEach(() => {
   jest.resetAllMocks();
   getUser.mockResolvedValue({ data: { user: { id: COACH } } });
   getUserRole.mockResolvedValue("coordinator");
   isServiceCoordinator.mockResolvedValue(true);
   select.mockImplementation(() => ({
      from: () => ({ where: () => ({ limit: selectLimit }) }),
   }));
   selectLimit.mockResolvedValue([service]);
   mutation.mockImplementation(() => {
      throw new Error("Unexpected local session mutation");
   });
   listCashSessionClients.mockResolvedValue([client]);
   getStripeServiceData.mockResolvedValue({
      title: "Reading",
      priceCents: 5000,
      priceCurrency: "cad",
   });
   getOrCreateStripeCustomer.mockResolvedValue("cus_1");
   recordOutOfBandInvoice.mockResolvedValue("in_paid");
   jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("cash recording authorization", () => {
   it("allows the assigned coordinator", async () => {
      expect(
         (await recordCashSession(null, form()))?.cashSession?.invoiceId,
      ).toBe("in_paid");
      expect(isServiceCoordinator).toHaveBeenCalledWith(COACH, SERVICE);
   });
   it("allows an admin and preserves collector versus recorder", async () => {
      getUser.mockResolvedValue({ data: { user: { id: ADMIN } } });
      getUserRole.mockResolvedValue("admin");
      await recordCashSession(null, form());
      expect(recordOutOfBandInvoice).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: expect.objectContaining({
               collectedBy: COACH,
               recordedBy: ADMIN,
            }),
         }),
      );
      expect(isServiceCoordinator).not.toHaveBeenCalled();
   });
   it.each(["user", null])(
      "rejects role %s before Stripe writes",
      async (role) => {
         getUserRole.mockResolvedValue(role);
         expect((await recordCashSession(null, form()))?.errors?._form).toEqual(
            ["Unauthorized"],
         );
         expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
      },
   );
   it("rejects unauthenticated users", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      expect((await recordCashSession(null, form()))?.errors?._form).toEqual([
         "Unauthorized",
      ]);
   });
   it("rejects another coordinator for both reading clients and recording", async () => {
      isServiceCoordinator.mockResolvedValue(false);
      expect((await recordCashSession(null, form()))?.errors?._form).toEqual([
         "Unauthorized",
      ]);
      await expect(fetchCashSessionClients(SERVICE)).rejects.toThrow(
         "Forbidden",
      );
      expect(listCashSessionClients).not.toHaveBeenCalled();
   });
});

describe("cash recording validation", () => {
   it.each(["session_at", "collected_at", "submitted_at"])(
      "rejects future %s",
      async (field) => {
         const result = await recordCashSession(
            null,
            form({ [field]: new Date(Date.now() + 86400000).toISOString() }),
         );
         expect(result?.errors?.[field]).toBeDefined();
         expect(result?.retryRequired).toBe(false);
         expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
      },
   );
   it.each(["0", "-1", "1.5", "1441"])(
      "rejects duration %s",
      async (duration_minutes) => {
         expect(
            (await recordCashSession(null, form({ duration_minutes })))?.errors
               ?.duration_minutes,
         ).toBeDefined();
      },
   );
   it.each(["0", "-1", "1.001", "1garbage", "Infinity"])(
      "rejects amount %s",
      async (amount) => {
         expect(
            (await recordCashSession(null, form({ amount })))?.errors?.amount,
         ).toBeDefined();
      },
   );
   it("rejects a whitespace-only adjustment reason", async () => {
      const result = await recordCashSession(
         null,
         form({ amount: "40", adjustment_reason: "   " }),
      );
      expect(result?.errors?.adjustment_reason).toBeDefined();
      expect(result?.retryRequired).toBe(false);
      expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
   });
   it.each([
      { type: "programs" },
      { status: "disabled" },
      { status: "archived" },
      { coordinatorId: null },
   ])("rejects ineligible service %j", async (override) => {
      selectLimit.mockResolvedValue([{ ...service, ...override }]);
      expect(
         (await recordCashSession(null, form()))?.errors?._form,
      ).toBeDefined();
      expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
   });
   it("requires a child on child services", async () => {
      selectLimit.mockResolvedValue([{ ...service, isForChildren: true }]);
      expect(
         (await recordCashSession(null, form()))?.errors?.child_id,
      ).toBeDefined();
   });
   it("rejects another parent's child", async () => {
      selectLimit.mockResolvedValue([{ ...service, isForChildren: true }]);
      expect(
         (await recordCashSession(null, form({ child_id: ADMIN })))?.errors
            ?.child_id,
      ).toBeDefined();
   });
   it("rejects even an owned child on an adult service", async () => {
      expect(
         (await recordCashSession(null, form({ child_id: CHILD })))?.errors
            ?.child_id,
      ).toEqual(["This service is for adult clients"]);
   });
});

describe("Stripe-only recording", () => {
   it("stores reconstructable child attendance and cash information, with no session mutation", async () => {
      selectLimit.mockResolvedValue([{ ...service, isForChildren: true }]);
      const data = form({
         child_id: CHILD,
         amount: "40.00",
         adjustment_reason: "  Sibling discount  ",
      });
      const result = await recordCashSession(null, data);
      expect(result?.cashSession).toEqual({
         invoiceId: "in_paid",
         submissionId: SUBMISSION,
         amountCents: 4000,
         currency: "cad",
      });
      expect(recordOutOfBandInvoice).toHaveBeenCalledWith(
         expect.objectContaining({
            customerId: "cus_1",
            amountCents: 4000,
            idempotencyKey: `cash-session:${SUBMISSION}`,
            submittedAt: Date.parse(data.get("submitted_at") as string),
            metadata: expect.objectContaining({
               type: "cash_private_lesson",
               schemaVersion: "1",
               submissionId: SUBMISSION,
               userId: CLIENT,
               childId: CHILD,
               serviceId: SERVICE,
               durationMinutes: "90",
               sessionAt: "2026-01-01T16:00:00.000Z",
               collectedAt: "2026-01-01T17:00:00.000Z",
               adjustmentReason: "Sibling discount",
            }),
         }),
      );
      expect(select).toHaveBeenCalledTimes(1); // service lookup only
      expect(mutation).not.toHaveBeenCalled();
   });
   it("does not delete anything on an uncertain Stripe response and resumes the same submission", async () => {
      recordOutOfBandInvoice
         .mockRejectedValueOnce(new Error("Connection lost after payment"))
         .mockResolvedValueOnce("in_paid");
      const data = form();
      const failed = await recordCashSession(null, data);
      expect(failed?.retryRequired).toBe(true);
      expect(
         (await recordCashSession(failed, data))?.cashSession?.invoiceId,
      ).toBe("in_paid");
      expect(recordOutOfBandInvoice.mock.calls[0][0]).toEqual(
         recordOutOfBandInvoice.mock.calls[1][0],
      );
      expect(mutation).not.toHaveBeenCalled();
   });
   it("keeps ambiguous old or conflicting invoices for review", async () => {
      recordOutOfBandInvoice.mockRejectedValue(
         new CashInvoiceReviewError(
            "Review the existing invoice before retrying.",
         ),
      );
      expect(await recordCashSession(null, form())).toEqual({
         retryRequired: true,
         reviewRequired: true,
         errors: { _form: ["Review the existing invoice before retrying."] },
      });
      expect(mutation).not.toHaveBeenCalled();
   });
   it("allows a later visit with a distinct identity", async () => {
      await recordCashSession(null, form());
      await recordCashSession(
         null,
         form({ submission_id: "88888888-8888-4888-8888-888888888888" }),
      );
      expect(
         recordOutOfBandInvoice.mock.calls[0][0].idempotencyKey,
      ).not.toEqual(recordOutOfBandInvoice.mock.calls[1][0].idempotencyKey);
   });
   it("does not attempt Stripe writes if preflight database lookup fails", async () => {
      selectLimit.mockRejectedValue(new Error("Database unavailable"));
      const result = await recordCashSession(null, form());
      expect(result?.errors?._form).toBeDefined();
      expect(result?.retryRequired).toBe(false);
      expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
   });
});
