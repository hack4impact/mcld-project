/**
 * @jest-environment node
 */
import {
   createUserAdmin,
   updateUserAdmin,
} from "@/app/(authenticated)/users/actions";

const requireAdmin = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

const updateUserById = jest.fn();
const createUser = jest.fn();
const deleteUser = jest.fn();
jest.mock("@/utils/supabase/admin", () => ({
   createAdminClient: () => ({
      auth: {
         admin: {
            updateUserById: (...args: unknown[]) => updateUserById(...args),
            createUser: (...args: unknown[]) => createUser(...args),
            deleteUser: (...args: unknown[]) => deleteUser(...args),
         },
      },
   }),
}));

jest.mock("@/lib/stripe", () => ({
   grantComplimentarySubscription: jest.fn(),
   stripe: {},
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const findFirst = jest.fn();
const updateWhere = jest.fn();
const updateSet = jest.fn(() => ({ where: updateWhere })) as jest.Mock;
const onConflictDoUpdate = jest.fn();
const insertValues = jest.fn(() => ({ onConflictDoUpdate })) as jest.Mock;
jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: (...args: unknown[]) => findFirst(...args),
         },
      },
      update: () => ({ set: (...args: unknown[]) => updateSet(...args) }),
      insert: () => ({ values: (...args: unknown[]) => insertValues(...args) }),
   },
}));

const USER_ID = "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70";

function formData(fields: Record<string, string>) {
   const fd = new FormData();
   for (const [key, value] of Object.entries(fields)) fd.append(key, value);
   return fd;
}

function editForm(details: Record<string, string>) {
   return formData({
      user_id: USER_ID,
      email: "ada@example.com",
      role: "user",
      address: "",
      gender: "",
      dob: "",
      phone: "",
      ...details,
   });
}

function createForm(details: Record<string, string>) {
   return formData({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      confirm_password: "correct-horse",
      role: "coordinator",
      subscription_months: "0",
      address: "",
      gender: "",
      dob: "",
      phone: "",
      ...details,
   });
}

beforeEach(() => {
   jest.clearAllMocks();
   requireAdmin.mockResolvedValue(undefined);
   findFirst.mockResolvedValue({ id: USER_ID });
   updateUserById.mockResolvedValue({ error: null });
   updateWhere.mockResolvedValue(undefined);
   createUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
   });
   onConflictDoUpdate.mockResolvedValue(undefined);
});

describe("updateUserAdmin contact details", () => {
   it("saves the details, trimming text and keeping only the phone digits", async () => {
      const result = await updateUserAdmin(
         null,
         editForm({
            address: "  123 Main St, Montreal  ",
            gender: "female",
            dob: "1990-04-12",
            phone: "+1 (514) 555-0100",
         }),
      );

      expect(result).toEqual({ message: "User updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({
            role: "user",
            address: "123 Main St, Montreal",
            gender: "female",
            dob: "1990-04-12",
            phone: "15145550100",
         }),
      );
   });

   it("clears details that are left blank", async () => {
      await updateUserAdmin(null, editForm({ address: "   " }));

      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({
            address: null,
            gender: null,
            dob: null,
            phone: null,
         }),
      );
   });

   it("rejects invalid details before changing the account or the profile", async () => {
      const result = await updateUserAdmin(
         null,
         editForm({
            gender: "other",
            dob: "2999-01-01",
            phone: "call me",
         }),
      );

      expect(Object.keys(result?.errors ?? {}).sort()).toEqual([
         "dob",
         "gender",
         "phone",
      ]);
      expect(result?.errors?.phone).toEqual([
         "Phone number must be 10–15 digits",
      ]);
      expect(updateUserById).not.toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("still requires an admin", async () => {
      requireAdmin.mockRejectedValue(new Error("Forbidden"));

      const result = await updateUserAdmin(
         null,
         editForm({ phone: "5145550100" }),
      );

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(updateSet).not.toHaveBeenCalled();
   });
});

describe("createUserAdmin contact details", () => {
   it("writes the details on insert and when the signup trigger already made the row", async () => {
      const result = await createUserAdmin(
         null,
         createForm({
            address: "123 Main St",
            gender: "prefer_not_to_say",
            dob: "1985-11-30",
            phone: "514-555-0100",
         }),
      );

      const details = {
         address: "123 Main St",
         gender: "prefer_not_to_say",
         dob: "1985-11-30",
         phone: "5145550100",
      };
      expect(result).toEqual({
         message: "User created.",
         data: { user_id: USER_ID },
      });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ id: USER_ID, ...details }),
      );
      expect(onConflictDoUpdate).toHaveBeenCalledWith(
         expect.objectContaining({
            set: expect.objectContaining(details),
         }),
      );
   });

   it("saves blank details as null", async () => {
      await createUserAdmin(null, createForm({}));

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            address: null,
            gender: null,
            dob: null,
            phone: null,
         }),
      );
   });

   it("rejects an invalid phone number before creating the account", async () => {
      const result = await createUserAdmin(
         null,
         createForm({ phone: "12345" }),
      );

      expect(result?.errors?.phone).toEqual([
         "Phone number must be 10–15 digits",
      ]);
      expect(createUser).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
   });
});
