/**
 * @jest-environment node
 */
import {
   createService,
   updateService,
} from "@/app/(authenticated)/services/actions";

// --- db mock (chainable query builder) -------------------------------------
const insertValues = jest.fn().mockResolvedValue(undefined);
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

const selectLimit = jest.fn();
const selectWhere = jest.fn(() => ({ limit: selectLimit }));
const selectFrom = jest.fn(() => ({ where: selectWhere }));
const select = jest.fn(() => ({ from: selectFrom })) as jest.Mock;

const updateWhere = jest.fn().mockResolvedValue(undefined);
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet })) as jest.Mock;

jest.mock("@/lib/db", () => ({
   db: {
      insert: (...args: unknown[]) => insert(...args),
      select: (...args: unknown[]) => select(...args),
      update: (...args: unknown[]) => update(...args),
   },
}));

// --- stripe mock ------------------------------------------------------------
const createProduct = jest.fn();
const createPrice = jest.fn();
const updateProduct = jest.fn();
const deactivateActivePricesForProduct = jest.fn();
const getStripeServiceData = jest.fn();

jest.mock("@/lib/stripe", () => ({
   createProduct: (...args: unknown[]) => createProduct(...args),
   createPrice: (...args: unknown[]) => createPrice(...args),
   updateProduct: (...args: unknown[]) => updateProduct(...args),
   deactivateActivePricesForProduct: (...args: unknown[]) =>
      deactivateActivePricesForProduct(...args),
   getStripeServiceData: (...args: unknown[]) => getStripeServiceData(...args),
}));

// --- auth + cache mocks -----------------------------------------------------
const requireAdmin = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

jest.mock("next/cache", () => ({
   revalidatePath: jest.fn(),
   updateTag: jest.fn(),
}));

const COACH_A = "11111111-1111-1111-1111-111111111111";
const COACH_B = "22222222-2222-2222-2222-222222222222";
const SERVICE_ID = "33333333-3333-3333-3333-333333333333";

function fd(obj: Record<string, string>): FormData {
   const f = new FormData();
   for (const [k, v] of Object.entries(obj)) f.append(k, v);
   return f;
}

beforeEach(() => {
   jest.clearAllMocks();
   requireAdmin.mockResolvedValue(undefined);
   createProduct.mockResolvedValue({ productId: "prod_1" });
   createPrice.mockResolvedValue(undefined);
   updateProduct.mockResolvedValue(undefined);
   deactivateActivePricesForProduct.mockResolvedValue(undefined);
   getStripeServiceData.mockResolvedValue({ priceCents: 5000 });
});

describe("createService", () => {
   it("rejects a private lesson without a coach", async () => {
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

      expect(result?.errors?.coach_id).toBeDefined();
      expect(insert).not.toHaveBeenCalled();
      expect(createProduct).not.toHaveBeenCalled();
   });

   it("persists the coach when creating a private lesson", async () => {
      const result = await createService(
         null,
         fd({
            title: "1:1 Lesson",
            description: "A private session",
            type: "private_lessons",
            duration_minutes: "60",
            price_cad: "50.00",
            coach_id: COACH_A,
         }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ type: "private_lessons", coachId: COACH_A }),
      );
   });

   it("creates a program with no coach", async () => {
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
         }),
      );

      expect(result).toEqual({ message: "Service created." });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ type: "programs", coachId: null }),
      );
   });
});

describe("updateService", () => {
   it("reassigns the coach on a private lesson", async () => {
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
         fd({ service_id: SERVICE_ID, coach_id: COACH_B }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ coachId: COACH_B }),
      );
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
         fd({ service_id: SERVICE_ID, coach_id: COACH_B, price_cad: "50.00" }),
      );

      expect(result).toEqual({ message: "Service updated." });
      expect(deactivateActivePricesForProduct).not.toHaveBeenCalled();
      expect(createPrice).not.toHaveBeenCalled();
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
      expect(deactivateActivePricesForProduct).toHaveBeenCalled();
      expect(createPrice).toHaveBeenCalledWith("prod_1", 7500);
   });

   it("rejects clearing the coach on a private lesson", async () => {
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
         fd({ service_id: SERVICE_ID, coach_id: "" }),
      );

      expect(result?.errors?.coach_id).toBeDefined();
      expect(updateSet).not.toHaveBeenCalled();
   });
});
