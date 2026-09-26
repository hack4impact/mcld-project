/**
 * @jest-environment node
 */
import {
   changeOwnPassword,
   updateOwnProfile,
} from "@/app/(authenticated)/settings/actions";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

const updateWhere = jest.fn();
const updateSet = jest.fn<{ where: typeof updateWhere }, [unknown]>(() => ({
   where: updateWhere,
}));
jest.mock("@/lib/db", () => ({
   db: { update: () => ({ set: updateSet }) },
}));

const getUser = jest.fn();
const updateUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser, updateUser } }),
}));

const signInWithPassword = jest.fn();
const signOut = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
   createClient: () => ({ auth: { signInWithPassword, signOut } }),
}));

const updateUserById = jest.fn();
jest.mock("@/utils/supabase/admin", () => ({
   createAdminClient: () => ({ auth: { admin: { updateUserById } } }),
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

function fd(values: Record<string, string>): FormData {
   const form = new FormData();
   for (const [key, value] of Object.entries(values)) form.append(key, value);
   return form;
}

const validProfile = {
   first_name: "Ada",
   last_name: "Lovelace",
   phone: "(514) 555-0100",
   address: "123 Rue Sainte-Catherine",
   gender: "female",
   dob: "1990-05-12",
};

beforeEach(() => {
   jest.clearAllMocks();
   getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "ada@example.com" } },
   });
   updateUser.mockResolvedValue({ error: null });
   updateWhere.mockResolvedValue(undefined);
   signInWithPassword.mockResolvedValue({ error: null });
   signOut.mockResolvedValue({ error: null });
   updateUserById.mockResolvedValue({ error: null });
});

describe("updateOwnProfile", () => {
   it("saves the signed-in user's profile and syncs the name", async () => {
      const result = await updateOwnProfile(null, fd(validProfile));

      expect(result).toEqual({ message: "Profile updated." });
      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({
            firstName: "Ada",
            lastName: "Lovelace",
            phone: "5145550100",
            address: "123 Rue Sainte-Catherine",
            gender: "female",
            dob: "1990-05-12",
         }),
      );
      expect(updateUser).toHaveBeenCalledWith({
         data: { first_name: "Ada", last_name: "Lovelace" },
      });
   });

   it("clears optional fields left blank", async () => {
      await updateOwnProfile(
         null,
         fd({
            first_name: "Ada",
            last_name: "Lovelace",
            phone: "",
            address: "",
            gender: "",
            dob: "",
         }),
      );

      expect(updateSet).toHaveBeenCalledWith(
         expect.objectContaining({
            phone: null,
            address: null,
            gender: null,
            dob: null,
         }),
      );
   });

   it("ignores a user id and role sent in the form", async () => {
      await updateOwnProfile(
         null,
         fd({ ...validProfile, user_id: OTHER_USER_ID, role: "admin" }),
      );

      const values = updateSet.mock.calls[0]![0] as Record<string, unknown>;
      expect(values).not.toHaveProperty("role");
      expect(values).not.toHaveProperty("id");
      // Only the session user's row is targeted (the id isn't in the payload).
      expect(JSON.stringify(values)).not.toContain(OTHER_USER_ID);
   });

   it("rejects an empty name", async () => {
      const result = await updateOwnProfile(
         null,
         fd({ ...validProfile, first_name: "  " }),
      );

      expect(result?.errors?.first_name).toEqual(["First name is required"]);
      expect(updateSet).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
   });

   it("rejects a date of birth in the future", async () => {
      const result = await updateOwnProfile(
         null,
         fd({ ...validProfile, dob: "2999-01-01" }),
      );

      expect(result?.errors?.dob).toBeDefined();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("rejects an invalid phone number", async () => {
      const result = await updateOwnProfile(
         null,
         fd({ ...validProfile, phone: "123" }),
      );

      expect(result?.errors?.phone).toEqual([
         "Phone number must be 10–15 digits",
      ]);
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("rejects an unknown gender", async () => {
      const result = await updateOwnProfile(
         null,
         fd({ ...validProfile, gender: "robot" }),
      );

      expect(result?.errors?.gender).toBeDefined();
   });

   it("requires a signed-in user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await updateOwnProfile(null, fd(validProfile));

      expect(result).toEqual({ errors: { _form: ["You must be signed in."] } });
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("doesn't save the profile when the name sync fails", async () => {
      updateUser.mockResolvedValue({ error: { message: "boom" } });

      const result = await updateOwnProfile(null, fd(validProfile));

      expect(result?.errors?._form).toBeDefined();
      expect(updateSet).not.toHaveBeenCalled();
   });
});

describe("changeOwnPassword", () => {
   const valid = {
      current_password: "old-password",
      new_password: "new-password-123",
      confirm_password: "new-password-123",
   };

   it("verifies the current password, then sets the new one", async () => {
      const result = await changeOwnPassword(null, fd(valid));

      expect(result).toEqual({ message: "Password changed." });
      expect(signInWithPassword).toHaveBeenCalledWith({
         email: "ada@example.com",
         password: "old-password",
      });
      expect(signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(updateUserById).toHaveBeenCalledWith(USER_ID, {
         password: "new-password-123",
      });
   });

   it("rejects a wrong current password", async () => {
      signInWithPassword.mockResolvedValue({
         error: { message: "Invalid login credentials" },
      });

      const result = await changeOwnPassword(null, fd(valid));

      expect(result).toEqual({
         errors: { current_password: ["Current password is incorrect"] },
      });
      expect(updateUserById).not.toHaveBeenCalled();
   });

   it("rejects a confirmation that doesn't match", async () => {
      const result = await changeOwnPassword(
         null,
         fd({ ...valid, confirm_password: "something-else" }),
      );

      expect(result?.errors?.confirm_password).toEqual([
         "Passwords do not match",
      ]);
      expect(signInWithPassword).not.toHaveBeenCalled();
      expect(updateUserById).not.toHaveBeenCalled();
   });

   it("rejects a new password shorter than 8 characters", async () => {
      const result = await changeOwnPassword(
         null,
         fd({ ...valid, new_password: "short", confirm_password: "short" }),
      );

      expect(result?.errors?.new_password).toEqual([
         "Password must be at least 8 characters",
      ]);
      expect(updateUserById).not.toHaveBeenCalled();
   });

   it("rejects reusing the current password", async () => {
      const result = await changeOwnPassword(
         null,
         fd({
            current_password: "same-password",
            new_password: "same-password",
            confirm_password: "same-password",
         }),
      );

      expect(result?.errors?.new_password).toBeDefined();
      expect(updateUserById).not.toHaveBeenCalled();
   });

   it("only changes the signed-in user's password", async () => {
      await changeOwnPassword(null, fd({ ...valid, user_id: OTHER_USER_ID }));

      expect(updateUserById).toHaveBeenCalledWith(USER_ID, expect.anything());
   });

   it("requires a signed-in user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await changeOwnPassword(null, fd(valid));

      expect(result).toEqual({ errors: { _form: ["You must be signed in."] } });
      expect(signInWithPassword).not.toHaveBeenCalled();
   });

   it("shows Supabase's reason when the new password is refused", async () => {
      updateUserById.mockResolvedValue({
         error: { message: "Password is known to be weak" },
      });

      const result = await changeOwnPassword(null, fd(valid));

      expect(result).toEqual({
         errors: { new_password: ["Password is known to be weak"] },
      });
   });
});
