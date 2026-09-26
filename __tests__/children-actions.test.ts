/**
 * @jest-environment node
 */
import {
   createChild,
   updateChild,
   deleteChild,
} from "@/app/(authenticated)/children/actions";
import { revalidatePath } from "next/cache";

const PARENT_ID = "11111111-1111-1111-1111-111111111111";
const CHILD_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_CHILD = "33333333-3333-3333-3333-333333333333";

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
      delete: (...args: unknown[]) => deleteFn(...args),
   },
}));

const getUser = jest.fn();
const getClaims = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser, getClaims } }),
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
      first_name: "Kid",
      last_name: "Name",
      dob: "2018-05-01",
      gender: "male",
      emergency_contacts: JSON.stringify([validContact]),
      ...extra,
   });
}

beforeEach(() => {
   jest.clearAllMocks();
   getUser.mockResolvedValue({ data: { user: { id: PARENT_ID } } });
   getClaims.mockResolvedValue({ data: { claims: { user_role: "user" } } });
   insertReturning.mockResolvedValue([{ id: CHILD_ID }]);
   selectLimit.mockResolvedValue([{ id: CHILD_ID }]);
});

describe("createChild", () => {
   it("returns Unauthorized when not signed in", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await createChild(null, childFields());

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("returns Unauthorized for coordinators", async () => {
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "coordinator" } },
      });

      const result = await createChild(null, childFields());

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("rejects a future date of birth", async () => {
      const result = await createChild(
         null,
         childFields({ dob: "2099-01-01" }),
      );

      expect(result?.errors?.dob).toBeDefined();
      expect(transaction).not.toHaveBeenCalled();
   });

   it("rejects a short phone number", async () => {
      const result = await createChild(
         null,
         childFields({
            emergency_contacts: JSON.stringify([
               { ...validContact, phone_number: "123" },
            ]),
         }),
      );

      expect(result?.errors?.emergency_contacts).toBeDefined();
      expect(transaction).not.toHaveBeenCalled();
   });

   it("requires at least one emergency contact", async () => {
      const result = await createChild(
         null,
         childFields({ emergency_contacts: "[]" }),
      );

      expect(result?.errors?.emergency_contacts).toBeDefined();
      expect(transaction).not.toHaveBeenCalled();
   });

   it("creates a child for the signed-in parent", async () => {
      const result = await createChild(null, childFields());

      expect(result).toEqual({
         message: "Child created.",
         data: { childId: CHILD_ID },
      });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            parentId: PARENT_ID,
            firstName: "Kid",
            lastName: "Name",
         }),
      );
      expect(revalidatePath).toHaveBeenCalledWith("/children");
      expect(revalidatePath).toHaveBeenCalledWith("/users");
   });
});

describe("updateChild", () => {
   it("blocks updates for children the parent does not own", async () => {
      selectLimit.mockResolvedValue([]);

      const result = await updateChild(
         null,
         childFields({ child_id: OTHER_CHILD }),
      );

      expect(result).toEqual({ errors: { _form: ["Child not found"] } });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("updates an owned child", async () => {
      const result = await updateChild(
         null,
         childFields({ child_id: CHILD_ID, first_name: "Updated" }),
      );

      expect(result).toEqual({
         message: "Child updated.",
         data: { childId: CHILD_ID },
      });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({ firstName: "Updated" }),
      );
   });
});

describe("deleteChild", () => {
   it("rejects a non-uuid child_id", async () => {
      const result = await deleteChild(null, fd({ child_id: "not-a-uuid" }));

      expect(result?.errors?.child_id).toBeDefined();
      expect(deleteFn).not.toHaveBeenCalled();
   });

   it("blocks deleting a child the parent does not own", async () => {
      selectLimit.mockResolvedValue([]);

      const result = await deleteChild(null, fd({ child_id: OTHER_CHILD }));

      expect(result).toEqual({ errors: { _form: ["Child not found"] } });
      expect(deleteFn).not.toHaveBeenCalled();
   });

   it("deletes an owned child", async () => {
      const result = await deleteChild(null, fd({ child_id: CHILD_ID }));

      expect(result).toEqual({ message: "Child deleted." });
      expect(deleteFn).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/children");
      expect(revalidatePath).toHaveBeenCalledWith("/users");
   });
});
