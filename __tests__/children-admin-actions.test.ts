/**
 * @jest-environment node
 */
import {
   createChildAdmin,
   updateChildAdmin,
   listChildrenForUserAdmin,
} from "@/app/(authenticated)/users/children-actions";
import { revalidatePath } from "next/cache";

const PARENT_ID = "11111111-1111-1111-1111-111111111111";
const CHILD_ID = "22222222-2222-2222-2222-222222222222";

const insertReturning = jest.fn();
const insertValues = jest.fn(() => ({ returning: insertReturning }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

const deleteWhere = jest.fn().mockResolvedValue(undefined);
const deleteFn = jest.fn(() => ({ where: deleteWhere })) as jest.Mock;

const updateWhere = jest.fn().mockResolvedValue(undefined);
const updateSet = jest.fn(() => ({ where: updateWhere }));
const update = jest.fn(() => ({ set: updateSet })) as jest.Mock;

const selectLimit = jest.fn();
const selectWhere = jest.fn(() => ({ limit: selectLimit }));
const selectFrom = jest.fn(() => ({ where: selectWhere }));
const select = jest.fn(() => ({ from: selectFrom })) as jest.Mock;

const transaction = jest.fn(async (cb: (tx: unknown) => unknown) =>
   cb({ insert, update, delete: deleteFn }),
);

jest.mock("@/lib/db", () => ({
   db: {
      transaction: (...args: unknown[]) => transaction(...args),
      select: (...args: unknown[]) => select(...args),
   },
}));

jest.mock("@/app/(authenticated)/users/children-queries", () => ({
   listChildrenForParent: jest.fn().mockResolvedValue([]),
}));

const requireAdmin = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

jest.mock("next/cache", () => ({
   revalidatePath: jest.fn(),
}));

const validContact = {
   full_name: "Jane Doe",
   email_address: "jane@example.com",
   phone_number: "4165551234",
   relationship: "Mother",
};

function fd(obj: Record<string, string>): FormData {
   const f = new FormData();
   for (const [k, v] of Object.entries(obj)) f.append(k, v);
   return f;
}

function childFields(extra: Record<string, string> = {}) {
   return fd({
      parent_id: PARENT_ID,
      first_name: "Kid",
      last_name: "Name",
      dob: "2018-05-01",
      gender: "female",
      emergency_contacts: JSON.stringify([validContact]),
      ...extra,
   });
}

beforeEach(() => {
   jest.clearAllMocks();
   requireAdmin.mockResolvedValue(undefined);
   insertReturning.mockResolvedValue([{ id: CHILD_ID }]);
   // first select = parent exists; second (update) = child exists
   selectLimit.mockResolvedValue([{ id: PARENT_ID }]);
});

describe("listChildrenForUserAdmin", () => {
   it("returns Unauthorized when the caller is not an admin", async () => {
      requireAdmin.mockRejectedValue(new Error("Forbidden"));

      const result = await listChildrenForUserAdmin(PARENT_ID);

      expect(result).toEqual({ error: "Unauthorized" });
   });
});

describe("createChildAdmin", () => {
   it("returns Unauthorized when the caller is not an admin", async () => {
      requireAdmin.mockRejectedValue(new Error("Forbidden"));

      const result = await createChildAdmin(null, childFields());

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("rejects when the parent profile does not exist", async () => {
      selectLimit.mockResolvedValue([]);

      const result = await createChildAdmin(null, childFields());

      expect(result).toEqual({ errors: { _form: ["User not found"] } });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("creates a child for the given parent", async () => {
      const result = await createChildAdmin(null, childFields());

      expect(result).toEqual({
         message: "Child created.",
         data: { childId: CHILD_ID },
      });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ parentId: PARENT_ID, firstName: "Kid" }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/users");
      expect(revalidatePath).toHaveBeenCalledWith("/children");
   });
});

describe("updateChildAdmin", () => {
   it("rejects clearing required fields via schema", async () => {
      const result = await updateChildAdmin(
         null,
         childFields({ child_id: CHILD_ID, first_name: "" }),
      );

      expect(result?.errors?.first_name).toBeDefined();
      expect(transaction).not.toHaveBeenCalled();
   });

   it("updates when the child belongs to the parent", async () => {
      selectLimit.mockResolvedValue([{ id: CHILD_ID }]);

      const result = await updateChildAdmin(
         null,
         childFields({ child_id: CHILD_ID, first_name: "Pat" }),
      );

      expect(result).toEqual({
         message: "Child updated.",
         data: { childId: CHILD_ID },
      });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ firstName: "Pat" }),
      );
   });
});
