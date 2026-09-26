/**
 * @jest-environment node
 */
import { updateTag } from "next/cache";
import {
   createService,
   updateService,
} from "@/app/(authenticated)/services/actions";

// db mock
const insertReturning = jest.fn();
const insertValues = jest.fn(() => ({ returning: insertReturning }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

const selectLimit = jest.fn();
const coordinatorLookup = jest.fn();
const selectFor = jest.fn().mockResolvedValue([]);
const selectWhere = jest.fn(() => ({
   limit: selectLimit,
   for: selectFor,
   then: (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
   ) => Promise.resolve(coordinatorLookup()).then(onFulfilled, onRejected),
}));
const selectFrom = jest.fn(() => ({ where: selectWhere }));
const select = jest.fn(() => ({ from: selectFrom })) as jest.Mock;

const updateWhere = jest.fn().mockResolvedValue(undefined);
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet })) as jest.Mock;

const deleteWhere = jest.fn().mockResolvedValue(undefined);
const del = jest.fn(() => ({ where: deleteWhere })) as jest.Mock;

const transaction = jest.fn();

jest.mock("@/lib/db", () => {
   const client = {
      insert: (...args: unknown[]) => insert(...args),
      select: (...args: unknown[]) => select(...args),
      update: (...args: unknown[]) => update(...args),
      delete: (...args: unknown[]) => del(...args),
   };
   return {
      db: {
         ...client,
         transaction: (fn: (tx: typeof client) => Promise<unknown>) =>
            transaction(fn, client),
      },
   };
});

// stripe mock
const createProduct = jest.fn();
const createPrice = jest.fn();
const updateProduct = jest.fn();
const replaceProductPrice = jest.fn();
const getStripeServiceData = jest.fn();

jest.mock("@/lib/stripe", () => ({
   createProduct: (...args: unknown[]) => createProduct(...args),
   createPrice: (...args: unknown[]) => createPrice(...args),
   updateProduct: (...args: unknown[]) => updateProduct(...args),
   replaceProductPrice: (...args: unknown[]) => replaceProductPrice(...args),
   getStripeServiceData: (...args: unknown[]) => getStripeServiceData(...args),
}));

// auth + cache mocks
const requireAdmin = jest.fn();
const getUserRole = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
   getUserRole: (...args: unknown[]) => getUserRole(...args),
}));

jest.mock("next/cache", () => ({
   revalidatePath: jest.fn(),
   updateTag: jest.fn(),
   cacheTag: jest.fn(),
}));

const COORDINATOR_A = "11111111-1111-1111-1111-111111111111";
const COORDINATOR_B = "22222222-2222-2222-2222-222222222222";
const SERVICE_ID = "33333333-3333-3333-3333-333333333333";

function fd(obj: Record<string, string>): FormData {
   const f = new FormData();
   for (const [k, v] of Object.entries(obj)) f.append(k, v);
   return f;
}

beforeEach(() => {
   jest.clearAllMocks();
   requireAdmin.mockResolvedValue(undefined);
   insertReturning.mockResolvedValue([{ id: SERVICE_ID }]);
   createProduct.mockResolvedValue({ productId: "prod_1" });
   createPrice.mockResolvedValue(undefined);
   updateProduct.mockResolvedValue(undefined);
   replaceProductPrice.mockResolvedValue({ priceId: "price_new" });
   getStripeServiceData.mockResolvedValue({ priceCents: 5000 });
   coordinatorLookup.mockReturnValue([
      { id: COORDINATOR_A },
      { id: COORDINATOR_B },
   ]);
   transaction.mockImplementation((fn, client) => fn(client));
});

describe("createService", () => {
   it("rejects a private lesson without a coordinator", async () => {
      const result = await createService(
         null,
         fd({
            title: "1:1 Lesson",
            description: "A private session",
            type: "private_lessons",
            duration_minutes: "60",
            price_cad: "50.00",
         }),
      );

      expect(result?.errors?.coordinator_id).toBeDefined();
      expect(insert).not.toHaveBeenCalled();
      expect(createProduct).not.toHaveBeenCalled();
   });

   it("persists the coordinator when creating a private lesson", async () => {
      const result = await createService(
         null,
         fd({
            title: "1:1 Lesson",
            description: "A private session",
            type: "private_lessons",
            duration_minutes: "60",
            price_cad: "50.00",
            requires_subscription: "true",
            coordinator_id: COORDINATOR_A,
         }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            type: "private_lessons",
            coordinatorId: COORDINATOR_A,
         }),
      );
   });

   it("creates a program with no coordinator", async () => {
      const result = await createService(
         null,
         fd({
            title: "Summer Program",
            description: "Group program",
            type: "programs",
            duration_minutes: "60",
            price_cad: "100.00",
            start_date: "2026-01-01",
            end_date: "2026-02-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "10:00" }]),
            requires_subscription: "true",
         }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ type: "programs", coordinatorId: null }),
      );
   });

   it("assigns multiple coordinators to a program", async () => {
      const result = await createService(
         null,
         fd({
            title: "Summer Program",
            description: "Group program",
            type: "programs",
            duration_minutes: "60",
            price_cad: "100.00",
            start_date: "2026-01-01",
            end_date: "2026-02-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "10:00" }]),
            requires_subscription: "true",
            coordinator_ids: JSON.stringify([COORDINATOR_A, COORDINATOR_B]),
         }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.arrayContaining([
            { serviceId: SERVICE_ID, coordinatorId: COORDINATOR_A },
            { serviceId: SERVICE_ID, coordinatorId: COORDINATOR_B },
         ]),
      );
   });
});

describe("updateService", () => {
   it("reassigns the coordinator on a private lesson", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      const result = await updateService(
         null,
         fd({ service_id: SERVICE_ID, coordinator_id: COORDINATOR_B }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ coordinatorId: COORDINATOR_B }),
      );
   });

   it("replaces program coordinators on update", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "programs",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      const result = await updateService(
         null,
         fd({
            service_id: SERVICE_ID,
            coordinator_ids: JSON.stringify([COORDINATOR_A]),
         }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(del).toHaveBeenCalled();
      expect(insertValues).toHaveBeenCalledWith([
         { serviceId: SERVICE_ID, coordinatorId: COORDINATOR_A },
      ]);
   });

   it("does not recreate the Stripe price when the amount is unchanged", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);
      getStripeServiceData.mockResolvedValue({ priceCents: 5000 });

      const result = await updateService(
         null,
         fd({
            service_id: SERVICE_ID,
            coordinator_id: COORDINATOR_B,
            price_cad: "50.00",
         }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(replaceProductPrice).not.toHaveBeenCalled();
   });

   it("recreates the Stripe price when the amount changes", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);
      getStripeServiceData.mockResolvedValue({ priceCents: 5000 });

      const result = await updateService(
         null,
         fd({ service_id: SERVICE_ID, price_cad: "75.00" }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(replaceProductPrice).toHaveBeenCalledWith("prod_1", 7500);
   });

   it("rejects clearing the coordinator on a private lesson", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      const result = await updateService(
         null,
         fd({ service_id: SERVICE_ID, coordinator_id: "" }),
      );

      expect(result?.errors?.coordinator_id).toBeDefined();
      expect(updateSet).not.toHaveBeenCalled();
   });
});

describe("scheduling flag", () => {
   const privateLesson = {
      title: "1:1 Lesson",
      description: "A private session",
      type: "private_lessons",
      duration_minutes: "60",
      price_cad: "50.00",
      requires_subscription: "true",
      coordinator_id: COORDINATOR_A,
   };

   it("creates a scheduled private lesson", async () => {
      const result = await createService(
         null,
         fd({ ...privateLesson, is_scheduled: "true" }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ isScheduled: true }),
      );
   });

   it("defaults a private lesson to non-scheduled", async () => {
      await createService(null, fd(privateLesson));

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ isScheduled: false }),
      );
   });

   it("never marks a program as scheduled", async () => {
      await createService(
         null,
         fd({
            title: "Summer Program",
            description: "Group program",
            type: "programs",
            duration_minutes: "60",
            price_cad: "100.00",
            start_date: "2026-01-01",
            end_date: "2026-02-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "10:00" }]),
            requires_subscription: "true",
            is_scheduled: "true",
         }),
      );

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ type: "programs", isScheduled: false }),
      );
   });

   it("rejects an invalid scheduling value", async () => {
      const result = await createService(
         null,
         fd({ ...privateLesson, is_scheduled: "maybe" }),
      );

      expect(result?.errors?.is_scheduled).toBeDefined();
      expect(insert).not.toHaveBeenCalled();
   });

   it("switches a private lesson to scheduled on update", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      const result = await updateService(
         null,
         fd({ service_id: SERVICE_ID, is_scheduled: "true" }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ isScheduled: true }),
      );
   });

   it("switches a private lesson back to non-scheduled on update", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      await updateService(
         null,
         fd({ service_id: SERVICE_ID, is_scheduled: "false" }),
      );

      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ isScheduled: false }),
      );
   });

   it("leaves the flag alone when it is not sent", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "private_lessons",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      await updateService(
         null,
         fd({ service_id: SERVICE_ID, coordinator_id: COORDINATOR_B }),
      );

      expect(updateSet).toHaveBeenCalledWith(
         expect.not.objectContaining({ isScheduled: expect.anything() }),
      );
   });

   it("ignores the flag on a program update", async () => {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            type: "programs",
            status: "active",
            stripeProductId: "prod_1",
         },
      ]);

      await updateService(
         null,
         fd({ service_id: SERVICE_ID, is_scheduled: "true" }),
      );

      expect(updateSet).not.toHaveBeenCalled();
   });
});

describe("coordinator writes", () => {
   it("rejects a program coordinator that no longer exists", async () => {
      coordinatorLookup.mockReturnValue([{ id: COORDINATOR_A }]);

      const result = await createService(
         null,
         fd({
            title: "Spring program",
            description: "Weekly sessions",
            type: "programs",
            duration_minutes: "60",
            price_cad: "80.00",
            start_date: "2026-10-01",
            end_date: "2026-12-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "17:00" }]),
            requires_subscription: "true",
            coordinator_ids: JSON.stringify([COORDINATOR_A, COORDINATOR_B]),
         }),
      );

      expect(result?.errors?.coordinator_ids).toEqual([
         "One or more selected coordinators no longer exist",
      ]);
      expect(createProduct).not.toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
   });

   it("creates the service and its coordinators in one transaction", async () => {
      await createService(
         null,
         fd({
            title: "Spring program",
            description: "Weekly sessions",
            type: "programs",
            duration_minutes: "60",
            price_cad: "80.00",
            start_date: "2026-10-01",
            end_date: "2026-12-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "17:00" }]),
            requires_subscription: "true",
            coordinator_ids: JSON.stringify([COORDINATOR_A]),
         }),
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(selectFor).toHaveBeenCalledWith("update");
   });

   it("deactivates the Stripe product when the transaction fails", async () => {
      transaction.mockRejectedValue(new Error("insert failed"));

      const result = await createService(
         null,
         fd({
            title: "Spring program",
            description: "Weekly sessions",
            type: "programs",
            duration_minutes: "60",
            price_cad: "80.00",
            start_date: "2026-10-01",
            end_date: "2026-12-01",
            slots: JSON.stringify([{ dayOfWeek: 1, time: "17:00" }]),
            requires_subscription: "true",
            coordinator_ids: JSON.stringify([COORDINATOR_A]),
         }),
      );

      expect(result?.errors?._form).toBeDefined();
      expect(updateProduct).toHaveBeenCalledWith("prod_1", { active: false });
   });
});

describe("audience and form", () => {
   const FORM_ID = "44444444-4444-4444-4444-444444444444";
   const program = {
      title: "Summer Program",
      description: "Group program",
      type: "programs",
      duration_minutes: "60",
      price_cad: "100.00",
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      slots: JSON.stringify([{ dayOfWeek: 1, time: "10:00" }]),
      requires_subscription: "true",
   };
   const privateLesson = {
      title: "1:1 Lesson",
      description: "A private session",
      type: "private_lessons",
      duration_minutes: "60",
      price_cad: "50.00",
      requires_subscription: "true",
      coordinator_id: COORDINATOR_A,
   };

   function existingService(fields: Record<string, unknown>) {
      selectLimit.mockResolvedValue([
         {
            id: SERVICE_ID,
            status: "active",
            stripeProductId: "prod_1",
            isForChildren: false,
            formId: null,
            ...fields,
         },
      ]);
   }

   it("creates a children's program with a form", async () => {
      const result = await createService(
         null,
         fd({ ...program, is_for_children: "true", form_id: FORM_ID }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ isForChildren: true, formId: FORM_ID }),
      );
      expect(updateTag).toHaveBeenCalledWith("forms");
   });

   it("creates a children's private lesson without a form", async () => {
      const result = await createService(
         null,
         fd({ ...privateLesson, is_for_children: "true", form_id: "" }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ isForChildren: true, formId: null }),
      );
   });

   it("never attaches a form to an adults service", async () => {
      await createService(
         null,
         fd({ ...program, is_for_children: "false", form_id: FORM_ID }),
      );

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ isForChildren: false, formId: null }),
      );
   });

   it("rejects a form that no longer exists", async () => {
      coordinatorLookup.mockReturnValueOnce([]);

      const result = await createService(
         null,
         fd({ ...program, is_for_children: "true", form_id: FORM_ID }),
      );

      expect(result?.errors?.form_id).toEqual([
         "The selected form no longer exists",
      ]);
      expect(createProduct).not.toHaveBeenCalled();
   });

   it("rejects a malformed form id", async () => {
      const result = await createService(
         null,
         fd({ ...program, is_for_children: "true", form_id: "not-a-form" }),
      );

      expect(result?.errors?.form_id).toEqual(["Invalid form"]);
      expect(createProduct).not.toHaveBeenCalled();
   });

   it("clears the form when a service switches to adults", async () => {
      existingService({
         type: "programs",
         isForChildren: true,
         formId: FORM_ID,
      });

      const result = await updateService(
         null,
         fd({ service_id: SERVICE_ID, is_for_children: "false" }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ isForChildren: false, formId: null }),
      );
      expect(updateTag).toHaveBeenCalledWith("forms");
   });

   it("saves the audience and form of a private lesson", async () => {
      existingService({ type: "private_lessons" });

      const result = await updateService(
         null,
         fd({
            service_id: SERVICE_ID,
            is_for_children: "true",
            form_id: FORM_ID,
         }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ isForChildren: true, formId: FORM_ID }),
      );
   });

   it("leaves the audience and form alone when they aren't sent", async () => {
      existingService({
         type: "programs",
         isForChildren: true,
         formId: FORM_ID,
      });

      await updateService(
         null,
         fd({ service_id: SERVICE_ID, duration_minutes: "90" }),
      );

      const patch = updateSet.mock.calls[0]![0] as Record<string, unknown>;
      expect(patch).toMatchObject({ durationMinutes: 90 });
      expect(patch).not.toHaveProperty("isForChildren");
      expect(patch).not.toHaveProperty("formId");
   });

   it("rejects a form that no longer exists on update", async () => {
      existingService({ type: "programs", isForChildren: true });
      coordinatorLookup.mockReturnValueOnce([]);

      const result = await updateService(
         null,
         fd({
            service_id: SERVICE_ID,
            is_for_children: "true",
            form_id: FORM_ID,
         }),
      );

      expect(result?.errors?.form_id).toEqual([
         "The selected form no longer exists",
      ]);
      expect(updateSet).not.toHaveBeenCalled();
   });
});
