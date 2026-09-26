/**
 * @jest-environment node
 */
import { recordCashSession } from "@/app/(authenticated)/services/actions";

// db mock: select().from().where().limit() resolves from a per-test queue
// (service row first, then the existing-session lookup).
const selectLimit = jest.fn();
const select = jest.fn(() => ({
   from: () => ({ where: () => ({ limit: selectLimit }) }),
}));

const onConflictDoNothing = jest.fn().mockResolvedValue(undefined);
const insertValues = jest.fn(() => ({ onConflictDoNothing }));
const insert = jest.fn(() => ({ values: insertValues }));

const updateWhere = jest.fn().mockResolvedValue(undefined);
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet }));

const deleteWhere = jest.fn().mockResolvedValue(undefined);
const del = jest.fn(() => ({ where: deleteWhere }));

jest.mock("@/lib/db", () => ({
   db: {
      select: (...a: unknown[]) => select(...(a as [])),
      insert: (...a: unknown[]) => insert(...(a as [])),
      update: (...a: unknown[]) => update(...(a as [])),
      delete: (...a: unknown[]) => del(...(a as [])),
   },
}));

const getStripeServiceData = jest.fn();
const getOrCreateStripeCustomer = jest.fn();
const recordOutOfBandInvoice = jest.fn();
jest.mock("@/lib/stripe", () => ({
   getStripeServiceData: (...a: unknown[]) => getStripeServiceData(...a),
   getOrCreateStripeCustomer: (...a: unknown[]) =>
      getOrCreateStripeCustomer(...a),
   recordOutOfBandInvoice: (...a: unknown[]) => recordOutOfBandInvoice(...a),
}));

const isServiceCoordinator = jest.fn();
const listCashSessionClients = jest.fn();
jest.mock("@/app/(authenticated)/services/queries", () => ({
   isServiceCoordinator: (...a: unknown[]) => isServiceCoordinator(...a),
   listCashSessionClients: (...a: unknown[]) => listCashSessionClients(...a),
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

const COORDINATOR = "11111111-1111-1111-1111-111111111111";
const ADMIN = "22222222-2222-2222-2222-222222222222";
const SERVICE_ID = "33333333-3333-3333-3333-333333333333";
const CLIENT_ID = "44444444-4444-4444-4444-444444444444";
const CHILD_ID = "55555555-5555-5555-5555-555555555555";
const SUBMISSION_ID = "66666666-6666-4666-8666-666666666666";

const service = {
   id: SERVICE_ID,
   type: "private_lessons",
   status: "active",
   coordinatorId: COORDINATOR,
   isForChildren: false,
   stripeProductId: "prod_1",
};

const client = {
   id: CLIENT_ID,
   firstName: "Pat",
   lastName: "Parent",
   email: "pat@example.com",
   children: [{ id: CHILD_ID, firstName: "Kid", lastName: "Parent" }],
};

function form(overrides: Record<string, string> = {}): FormData {
   const values: Record<string, string> = {
      submission_id: SUBMISSION_ID,
      service_id: SERVICE_ID,
      user_id: CLIENT_ID,
      session_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      duration_minutes: "60",
      amount: "50.00",
      ...overrides,
   };
   const f = new FormData();
   for (const [k, v] of Object.entries(values)) f.append(k, v);
   return f;
}

function asCoordinator() {
   getUser.mockResolvedValue({ data: { user: { id: COORDINATOR } } });
   getUserRole.mockResolvedValue("coordinator");
   isServiceCoordinator.mockResolvedValue(true);
}

beforeEach(() => {
   jest.clearAllMocks();
   asCoordinator();
   selectLimit
      .mockReset()
      .mockResolvedValueOnce([service])
      .mockResolvedValueOnce([]);
   listCashSessionClients.mockResolvedValue([client]);
   getStripeServiceData.mockResolvedValue({
      title: "1:1 Reading",
      priceCents: 5000,
      priceCurrency: "cad",
   });
   getOrCreateStripeCustomer.mockResolvedValue("cus_1");
   recordOutOfBandInvoice.mockResolvedValue("in_1");
});

describe("recordCashSession — authorization", () => {
   it("lets a coordinator record on their own service", async () => {
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ message: "Cash session recorded." });
      expect(isServiceCoordinator).toHaveBeenCalledWith(
         COORDINATOR,
         SERVICE_ID,
      );
   });

   it("rejects a coordinator on someone else's service", async () => {
      isServiceCoordinator.mockResolvedValue(false);
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(insert).not.toHaveBeenCalled();
   });

   it("lets an admin record on any service, collected by the coordinator", async () => {
      getUser.mockResolvedValue({ data: { user: { id: ADMIN } } });
      getUserRole.mockResolvedValue("admin");
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ message: "Cash session recorded." });
      expect(isServiceCoordinator).not.toHaveBeenCalled();
      expect(recordOutOfBandInvoice).toHaveBeenCalledWith(
         expect.objectContaining({
            metadata: expect.objectContaining({
               collectedBy: COORDINATOR,
               recordedBy: ADMIN,
            }),
         }),
      );
   });

   it("rejects parents", async () => {
      getUserRole.mockResolvedValue("user");
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ errors: { _form: ["Unauthorized"] } });
   });
});

describe("recordCashSession — validation", () => {
   it("rejects a session in the future", async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await recordCashSession(null, form({ session_at: future }));
      expect(res?.errors?.session_at).toBeDefined();
   });

   it("rejects a zero duration", async () => {
      const res = await recordCashSession(
         null,
         form({ duration_minutes: "0" }),
      );
      expect(res?.errors?.duration_minutes).toBeDefined();
   });

   it("rejects a zero amount", async () => {
      const res = await recordCashSession(null, form({ amount: "0" }));
      expect(res?.errors?.amount).toBeDefined();
   });

   it("requires a reason when the price is adjusted", async () => {
      const res = await recordCashSession(null, form({ amount: "40.00" }));
      expect(res?.errors?.adjustment_reason).toBeDefined();
      expect(insert).not.toHaveBeenCalled();
   });

   it("accepts an adjusted price with a reason and stores it", async () => {
      const res = await recordCashSession(
         null,
         form({ amount: "40.00", adjustment_reason: "Sibling discount" }),
      );
      expect(res).toEqual({ message: "Cash session recorded." });
      expect(recordOutOfBandInvoice).toHaveBeenCalledWith(
         expect.objectContaining({
            amountCents: 4000,
            metadata: expect.objectContaining({
               adjustmentReason: "Sibling discount",
            }),
         }),
      );
   });

   it("rejects non-private-lesson services", async () => {
      selectLimit
         .mockReset()
         .mockResolvedValueOnce([{ ...service, type: "programs" }]);
      const res = await recordCashSession(null, form());
      expect(res?.errors?._form).toBeDefined();
   });

   it("requires a child on children's services", async () => {
      selectLimit
         .mockReset()
         .mockResolvedValueOnce([{ ...service, isForChildren: true }]);
      const res = await recordCashSession(null, form());
      expect(res?.errors?.child_id).toBeDefined();
   });

   it("rejects a child that isn't the client's", async () => {
      const res = await recordCashSession(
         null,
         form({ child_id: "77777777-7777-4777-8777-777777777777" }),
      );
      expect(res?.errors?.child_id).toBeDefined();
   });
});

describe("recordCashSession — saving", () => {
   it("saves a completed cash session and records a paid invoice", async () => {
      await recordCashSession(null, form());
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            id: SUBMISSION_ID,
            status: "completed",
            selectedTimeSlots: [],
         }),
      );
      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith(
         CLIENT_ID,
         "pat@example.com",
      );
      expect(recordOutOfBandInvoice).toHaveBeenCalledWith(
         expect.objectContaining({
            customerId: "cus_1",
            productId: "prod_1",
            amountCents: 5000,
            idempotencyKey: `cash-session:${SUBMISSION_ID}`,
            metadata: expect.objectContaining({
               type: "cash_private_lesson",
               privateLessonSessionId: SUBMISSION_ID,
               durationMinutes: "60",
            }),
         }),
      );
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ stripeOrderId: "in_1" }),
      );
   });

   it("does nothing on a resubmit that already has an invoice", async () => {
      selectLimit
         .mockReset()
         .mockResolvedValueOnce([service])
         .mockResolvedValueOnce([{ id: SUBMISSION_ID, stripeOrderId: "in_1" }]);
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ message: "Cash session recorded." });
      expect(insert).not.toHaveBeenCalled();
      expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
   });

   it("finishes a resubmit whose invoice step never completed", async () => {
      selectLimit
         .mockReset()
         .mockResolvedValueOnce([service])
         .mockResolvedValueOnce([
            {
               id: SUBMISSION_ID,
               stripeOrderId: null,
               status: "completed",
               serviceId: SERVICE_ID,
               userId: CLIENT_ID,
            },
         ]);
      const res = await recordCashSession(null, form());
      expect(res).toEqual({ message: "Cash session recorded." });
      expect(insert).not.toHaveBeenCalled();
      expect(recordOutOfBandInvoice).toHaveBeenCalledTimes(1);
   });

   it("refuses to attach cash to an online booking", async () => {
      selectLimit
         .mockReset()
         .mockResolvedValueOnce([service])
         .mockResolvedValueOnce([
            {
               id: SUBMISSION_ID,
               stripeOrderId: "cs_test_1",
               status: "pending",
               serviceId: SERVICE_ID,
               userId: CLIENT_ID,
            },
         ]);
      const res = await recordCashSession(null, form());
      expect(res?.errors?._form).toBeDefined();
      expect(recordOutOfBandInvoice).not.toHaveBeenCalled();
   });

   it("allows repeat visits as separate sessions", async () => {
      const second = "88888888-8888-4888-8888-888888888888";
      await recordCashSession(null, form());
      selectLimit.mockResolvedValueOnce([service]).mockResolvedValueOnce([]);
      await recordCashSession(null, form({ submission_id: second }));
      expect(insertValues).toHaveBeenCalledTimes(2);
      expect(recordOutOfBandInvoice).toHaveBeenLastCalledWith(
         expect.objectContaining({ idempotencyKey: `cash-session:${second}` }),
      );
   });

   it("removes the session when Stripe fails", async () => {
      recordOutOfBandInvoice.mockRejectedValue(new Error("stripe down"));
      jest.spyOn(console, "error").mockImplementation(() => {});
      const res = await recordCashSession(null, form());
      expect(res?.errors?._form).toBeDefined();
      expect(del).toHaveBeenCalled();
      expect(deleteWhere).toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });
});
