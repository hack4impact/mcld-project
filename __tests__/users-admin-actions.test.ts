/**
 * @jest-environment node
 */
import {
   createUserAdmin,
   deleteUserAdmin,
   resendInviteAdmin,
   updateUserAdmin,
} from "@/app/(authenticated)/users/actions";

const calls: string[] = [];

const requireAdmin = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

const getUserById = jest.fn();
const updateUserById = jest.fn();
const generateLink = jest.fn();
const deleteUser = jest.fn();
jest.mock("@/utils/supabase/admin", () => ({
   createAdminClient: () => ({
      auth: {
         admin: {
            getUserById: (...args: unknown[]) => getUserById(...args),
            updateUserById: (...args: unknown[]) => updateUserById(...args),
            generateLink: (...args: unknown[]) => generateLink(...args),
            deleteUser: (...args: unknown[]) => deleteUser(...args),
         },
      },
   }),
}));

const grantComplimentarySubscription = jest.fn();
jest.mock("@/lib/stripe", () => ({
   grantComplimentarySubscription: (...args: unknown[]) =>
      grantComplimentarySubscription(...args),
   stripe: {},
}));

const sendInviteEmail = jest.fn();
const sendEmailChangeRequest = jest.fn();
const sendRoleChangedNotice = jest.fn();
const sendAccountDeletedNotice = jest.fn();
jest.mock("@/lib/auth/account-emails", () => ({
   sendInviteEmail: (...args: unknown[]) => sendInviteEmail(...args),
   sendEmailChangeRequest: (...args: unknown[]) =>
      sendEmailChangeRequest(...args),
   sendRoleChangedNotice: (...args: unknown[]) =>
      sendRoleChangedNotice(...args),
   sendAccountDeletedNotice: (...args: unknown[]) =>
      sendAccountDeletedNotice(...args),
   sendNotice: async (_label: string, send: () => Promise<void>) => {
      try {
         await send();
         return true;
      } catch {
         return false;
      }
   },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const emailConfirmationRequired = jest.fn();
jest.mock("@/lib/auth/supabase-settings", () => ({
   emailConfirmationRequired: (...args: unknown[]) =>
      emailConfirmationRequired(...args),
}));

const findFirst = jest.fn();
const updateWhere = jest.fn();
const updateSet = jest.fn(() => ({ where: updateWhere })) as jest.Mock;
const onConflictDoUpdate = jest.fn();
const insertValues = jest.fn(() => ({ onConflictDoUpdate })) as jest.Mock;
const selectLimit = jest.fn();
const deleteWhere = jest.fn();
jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: (...args: unknown[]) => findFirst(...args),
         },
      },
      update: () => ({ set: (...args: unknown[]) => updateSet(...args) }),
      insert: () => ({ values: (...args: unknown[]) => insertValues(...args) }),
      select: () => ({
         from: () => ({
            where: () => ({
               limit: (...args: unknown[]) => selectLimit(...args),
            }),
         }),
      }),
      delete: () => ({ where: (...args: unknown[]) => deleteWhere(...args) }),
   },
}));

const USER_ID = "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70";
const INVITED_AT = "2026-09-26T12:00:00Z";

function formData(fields: Record<string, string>) {
   const fd = new FormData();
   for (const [key, value] of Object.entries(fields)) fd.append(key, value);
   return fd;
}

function editForm(fields: Record<string, string>) {
   return formData({
      user_id: USER_ID,
      email: "ada@example.com",
      role: "user",
      address: "",
      gender: "",
      dob: "",
      phone: "",
      ...fields,
   });
}

function roleOnlyForm(role: string) {
   return formData({ user_id: USER_ID, email: "ada@example.com", role });
}

function createForm(fields: Record<string, string>) {
   return formData({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      role: "coordinator",
      subscription_months: "0",
      address: "",
      gender: "",
      dob: "",
      phone: "",
      ...fields,
   });
}

function authUser(overrides: Record<string, unknown> = {}) {
   return {
      id: USER_ID,
      email: "ada@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      invited_at: null,
      ...overrides,
   };
}

function link(type: string, token: string, hashedToken = token) {
   return {
      data: {
         user: authUser({ email_confirmed_at: null, invited_at: INVITED_AT }),
         properties: {
            action_link: `https://example.supabase.co/auth/v1/verify?token=${token}&type=${type}&redirect_to=http%3A%2F%2Flocalhost%3A3000`,
            hashed_token: hashedToken,
            email_otp: "123456",
            redirect_to: "http://localhost:3000",
            verification_type: type,
         },
      },
      error: null,
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   calls.length = 0;
   requireAdmin.mockResolvedValue(undefined);
   findFirst.mockResolvedValue({ id: USER_ID, firstName: "Ada", role: "user" });
   getUserById.mockResolvedValue({ data: { user: authUser() }, error: null });
   updateUserById.mockImplementation(async () => {
      calls.push("metadata");
      return { error: null };
   });
   updateWhere.mockResolvedValue(undefined);
   insertValues.mockImplementation(() => {
      calls.push("profile");
      return { onConflictDoUpdate };
   });
   onConflictDoUpdate.mockResolvedValue(undefined);
   selectLimit.mockResolvedValue([]);
   deleteWhere.mockResolvedValue(undefined);
   deleteUser.mockImplementation(async () => {
      calls.push("delete");
      return { error: null };
   });
   generateLink.mockImplementation(async () => link("invite", "invite-token"));
   emailConfirmationRequired.mockResolvedValue(true);
   grantComplimentarySubscription.mockImplementation(async () => {
      calls.push("subscription");
   });
   sendInviteEmail.mockImplementation(async () => {
      calls.push("invite email");
   });
   sendEmailChangeRequest.mockResolvedValue(undefined);
   sendRoleChangedNotice.mockResolvedValue(undefined);
   sendAccountDeletedNotice.mockImplementation(async () => {
      calls.push("deleted notice");
   });
});

describe("updateUserAdmin contact details", () => {
   it("saves the details, trimming text and stripping phone formatting", async () => {
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
            phone: "+15145550100",
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
      expect(generateLink).not.toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("leaves contact details alone when they are not submitted", async () => {
      const result = await updateUserAdmin(null, roleOnlyForm("coordinator"));

      expect(result).toEqual({ message: "User updated." });
      const patch = updateSet.mock.calls[0]![0] as Record<string, unknown>;
      expect(patch.role).toBe("coordinator");
      for (const field of ["address", "gender", "dob", "phone"]) {
         expect(patch).not.toHaveProperty(field);
      }
   });

   it("writes only the contact fields that were submitted", async () => {
      await updateUserAdmin(
         null,
         formData({
            user_id: USER_ID,
            email: "ada@example.com",
            role: "user",
            phone: "438 555 0199",
         }),
      );

      const patch = updateSet.mock.calls[0]![0] as Record<string, unknown>;
      expect(patch.phone).toBe("4385550199");
      expect(patch).not.toHaveProperty("address");
      expect(patch).not.toHaveProperty("dob");
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

describe("updateUserAdmin email changes", () => {
   it("never changes the email directly", async () => {
      await updateUserAdmin(null, editForm({ role: "coordinator" }));

      expect(generateLink).not.toHaveBeenCalled();
      expect(updateUserById).toHaveBeenCalledWith(USER_ID, {
         app_metadata: { user_role: "coordinator" },
      });
   });

   it("asks the current address to approve and the new one to confirm", async () => {
      generateLink
         .mockResolvedValueOnce(link("email_change", "current-token"))
         // Supabase's hashed_token for the new address is wrong; the link's is right.
         .mockResolvedValueOnce(
            link("email_change", "new-token", "wrong-hash-from-current-email"),
         );

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com" }),
      );

      expect(generateLink).toHaveBeenNthCalledWith(1, {
         type: "email_change_current",
         email: "ada@example.com",
         newEmail: "ada@new.example.com",
      });
      expect(generateLink).toHaveBeenNthCalledWith(2, {
         type: "email_change_new",
         email: "ada@example.com",
         newEmail: "ada@new.example.com",
      });
      expect(sendEmailChangeRequest).toHaveBeenCalledWith({
         firstName: "Ada",
         currentEmail: "ada@example.com",
         newEmail: "ada@new.example.com",
         currentTokenHash: "current-token",
         newTokenHash: "new-token",
      });
      expect(updateUserById).toHaveBeenCalledWith(USER_ID, {
         app_metadata: { user_role: "user" },
      });
      expect(result?.message).toContain(
         "Confirmation links were sent to ada@example.com and ada@new.example.com",
      );
   });

   it("treats a change of letter case as no change", async () => {
      await updateUserAdmin(null, editForm({ email: "ADA@example.com" }));

      expect(generateLink).not.toHaveBeenCalled();
   });

   it("refuses to change the email of an invitation nobody accepted", async () => {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               email_confirmed_at: null,
               invited_at: "2026-09-01T00:00:00Z",
            }),
         },
         error: null,
      });

      const result = await updateUserAdmin(
         null,
         editForm({ email: "typo-fixed@example.com" }),
      );

      expect(result?.errors?.email?.[0]).toMatch(/hasn't accepted/);
      expect(generateLink).not.toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("reports an address that another account uses", async () => {
      generateLink.mockResolvedValueOnce({
         data: { user: null, properties: null },
         error: {
            code: "email_exists",
            message:
               "A user with this email address has already been registered",
         },
      });

      const result = await updateUserAdmin(
         null,
         editForm({ email: "taken@example.com", role: "admin" }),
      );

      expect(result).toEqual({
         errors: {
            email: [
               "Your other changes were saved, but the email wasn't changed: Another account already uses this email.",
            ],
         },
      });
      expect(sendEmailChangeRequest).not.toHaveBeenCalled();
   });

   it("explains when secure email change is turned off", async () => {
      generateLink.mockResolvedValueOnce({
         data: { user: null, properties: null },
         error: {
            code: "validation_failed",
            message:
               "Enable secure email change to generate link for current email",
         },
      });

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com" }),
      );

      expect(result?.errors?.email?.[0]).toMatch(
         /Secure email change is turned off/,
      );
      expect(sendEmailChangeRequest).not.toHaveBeenCalled();
   });

   it("says the other changes were saved when the confirmation emails can't be sent", async () => {
      generateLink
         .mockResolvedValueOnce(link("email_change", "current-token"))
         .mockResolvedValueOnce(link("email_change", "new-token"));
      sendEmailChangeRequest.mockRejectedValue(new Error("SMTP down"));

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com" }),
      );

      expect(result?.errors?.email?.[0]).toMatch(
         /^Your other changes were saved, but the email wasn't changed: Could not send/,
      );
      expect(updateSet).toHaveBeenCalled();
   });

   it("only starts the email change once everything else is saved", async () => {
      generateLink
         .mockResolvedValueOnce(link("email_change", "current-token"))
         .mockResolvedValueOnce(link("email_change", "new-token"));

      await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com", role: "coordinator" }),
      );

      const firstLink = generateLink.mock.invocationCallOrder[0]!;
      expect(updateSet.mock.invocationCallOrder[0]!).toBeLessThan(firstLink);
      expect(sendRoleChangedNotice.mock.invocationCallOrder[0]!).toBeLessThan(
         firstLink,
      );
   });

   it("refuses while Supabase's Confirm email is off, before saving anything", async () => {
      emailConfirmationRequired.mockResolvedValue(false);

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com", role: "coordinator" }),
      );

      expect(result?.errors?.email?.[0]).toMatch(/“Confirm email” setting/);
      expect(generateLink).not.toHaveBeenCalled();
      expect(updateUserById).not.toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("refuses when Supabase's settings can't be checked", async () => {
      emailConfirmationRequired.mockRejectedValue(new Error("network"));

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ada@new.example.com" }),
      );

      expect(result?.errors?.email?.[0]).toMatch(/Could not check/);
      expect(generateLink).not.toHaveBeenCalled();
      expect(updateSet).not.toHaveBeenCalled();
   });

   it("sends a fresh pair when the same change is requested again", async () => {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               new_email: "ada@new.example.com",
               email_change_sent_at: new Date(
                  Date.now() - 5 * 60_000,
               ).toISOString(),
            }),
         },
         error: null,
      });
      generateLink
         .mockResolvedValueOnce(link("email_change", "current-token"))
         .mockResolvedValueOnce(link("email_change", "new-token"));

      const result = await updateUserAdmin(
         null,
         editForm({ email: "ADA@new.example.com" }),
      );

      expect(generateLink).toHaveBeenCalledTimes(2);
      expect(sendEmailChangeRequest).toHaveBeenCalledTimes(1);
      expect(result?.message).toContain("Confirmation links were sent");
   });

   it("sends new links once the previous ones have expired", async () => {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               new_email: "ada@new.example.com",
               email_change_sent_at: new Date(
                  Date.now() - 2 * 3600_000,
               ).toISOString(),
            }),
         },
         error: null,
      });
      generateLink
         .mockResolvedValueOnce(link("email_change", "current-token"))
         .mockResolvedValueOnce(link("email_change", "new-token"));

      await updateUserAdmin(null, editForm({ email: "ada@new.example.com" }));

      expect(generateLink).toHaveBeenCalledTimes(2);
   });
});

describe("updateUserAdmin role notice", () => {
   it("tells the user after their role actually changed", async () => {
      await updateUserAdmin(null, editForm({ role: "coordinator" }));

      expect(sendRoleChangedNotice).toHaveBeenCalledWith({
         to: "ada@example.com",
         firstName: "Ada",
         oldRole: "User",
         newRole: "Coordinator",
      });
   });

   it("sends nothing when the role didn't change", async () => {
      await updateUserAdmin(null, editForm({ role: "user" }));

      expect(sendRoleChangedNotice).not.toHaveBeenCalled();
   });

   it("sends nothing when saving the profile failed", async () => {
      updateWhere.mockRejectedValue(new Error("db down"));

      const result = await updateUserAdmin(
         null,
         editForm({ role: "coordinator" }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/Failed to update profile/);
      expect(sendRoleChangedNotice).not.toHaveBeenCalled();
   });

   it("sends nothing to an address that was never verified", async () => {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               email_confirmed_at: null,
               invited_at: "2026-09-01T00:00:00Z",
            }),
         },
         error: null,
      });

      await updateUserAdmin(null, editForm({ role: "coordinator" }));

      expect(sendRoleChangedNotice).not.toHaveBeenCalled();
   });

   it("keeps the change and warns when the notice can't be delivered", async () => {
      sendRoleChangedNotice.mockRejectedValue(new Error("SMTP down"));

      const result = await updateUserAdmin(
         null,
         editForm({ role: "coordinator" }),
      );

      expect(updateSet).toHaveBeenCalled();
      expect(result?.message).toBe(
         "User updated. The role-change email couldn't be sent.",
      );
   });
});

describe("createUserAdmin invitation", () => {
   it("sets the account up before emailing the invitation", async () => {
      const result = await createUserAdmin(
         null,
         createForm({ role: "user", subscription_months: "3" }),
      );

      expect(generateLink).toHaveBeenCalledWith({
         type: "invite",
         email: "ada@example.com",
         options: { data: { first_name: "Ada", last_name: "Lovelace" } },
      });
      expect(calls).toEqual([
         "profile",
         "metadata",
         "subscription",
         "invite email",
      ]);
      expect(grantComplimentarySubscription).toHaveBeenCalledWith(
         USER_ID,
         "ada@example.com",
         3,
      );
      expect(sendInviteEmail).toHaveBeenCalledWith({
         to: "ada@example.com",
         firstName: "Ada",
         tokenHash: "invite-token",
      });
      expect(result).toEqual({
         message: "Invitation sent to ada@example.com.",
         data: { user_id: USER_ID },
      });
   });

   it("only grants a subscription to regular users", async () => {
      await createUserAdmin(
         null,
         createForm({ role: "coordinator", subscription_months: "3" }),
      );

      expect(grantComplimentarySubscription).not.toHaveBeenCalled();
   });

   it("refuses an address that already has an account", async () => {
      selectLimit.mockResolvedValue([
         { id: USER_ID, emailConfirmedAt: new Date("2026-01-01T00:00:00Z") },
      ]);

      const result = await createUserAdmin(null, createForm({}));

      expect(result).toEqual({
         errors: { email: ["A user with this email already exists."] },
      });
      expect(generateLink).not.toHaveBeenCalled();
   });

   it("maps Supabase's duplicate-email error to the email field", async () => {
      generateLink.mockResolvedValue({
         data: { user: null, properties: null },
         error: { code: "email_exists", message: "already registered" },
      });

      const result = await createUserAdmin(null, createForm({}));

      expect(result).toEqual({
         errors: { email: ["A user with this email already exists."] },
      });
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("deletes a new account and sends nothing when setting it up fails", async () => {
      onConflictDoUpdate.mockRejectedValue(new Error("db down"));
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               email_confirmed_at: null,
               invited_at: INVITED_AT,
            }),
         },
         error: null,
      });

      const result = await createUserAdmin(null, createForm({}));

      expect(result?.errors?._form?.[0]).toMatch(/no invitation was sent/);
      expect(deleteUser).toHaveBeenCalledWith(USER_ID);
      expect(deleteWhere).toHaveBeenCalled();
      expect(sendInviteEmail).not.toHaveBeenCalled();
      expect(grantComplimentarySubscription).not.toHaveBeenCalled();
   });

   it("doesn't delete an account another request re-invited meanwhile", async () => {
      onConflictDoUpdate.mockRejectedValue(new Error("db down"));
      getUserById.mockResolvedValue({
         data: {
            user: authUser({
               email_confirmed_at: null,
               invited_at: "2026-09-26T12:00:01Z",
            }),
         },
         error: null,
      });

      await createUserAdmin(null, createForm({}));

      expect(deleteUser).not.toHaveBeenCalled();
   });

   it("refuses an address someone signed up with but never confirmed", async () => {
      selectLimit.mockResolvedValue([
         { id: USER_ID, emailConfirmedAt: null, invitedAt: null },
      ]);

      const result = await createUserAdmin(null, createForm({ role: "admin" }));

      expect(result?.errors?.email?.[0]).toMatch(/never confirmed it/);
      expect(generateLink).not.toHaveBeenCalled();
      expect(updateUserById).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("keeps a pending invitation's account when a retry fails to set it up", async () => {
      selectLimit.mockResolvedValue([
         {
            id: USER_ID,
            emailConfirmedAt: null,
            invitedAt: new Date(INVITED_AT),
         },
      ]);
      updateUserById.mockResolvedValue({
         error: { message: "metadata failed" },
      });

      const result = await createUserAdmin(null, createForm({}));

      expect(result?.errors?._form?.[0]).toMatch(/no invitation was sent/);
      expect(deleteUser).not.toHaveBeenCalled();
      expect(sendInviteEmail).not.toHaveBeenCalled();
   });

   it("keeps the account but sends nothing when the subscription fails", async () => {
      grantComplimentarySubscription.mockRejectedValue(
         new Error("stripe down"),
      );

      const result = await createUserAdmin(
         null,
         createForm({ role: "user", subscription_months: "2" }),
      );

      expect(result?.errors?._form?.[0]).toMatch(
         /complimentary subscription could not be added, so no invitation was sent/,
      );
      expect(deleteUser).not.toHaveBeenCalled();
      expect(sendInviteEmail).not.toHaveBeenCalled();
   });

   it("reports a failed invitation email separately from the account setup", async () => {
      sendInviteEmail.mockRejectedValue(new Error("SMTP down"));

      const result = await createUserAdmin(null, createForm({}));

      expect(result?.errors?._form?.[0]).toMatch(
         /account is set up, but the invitation email could not be sent/,
      );
      expect(deleteUser).not.toHaveBeenCalled();
   });

   it("writes the contact details on insert and when the signup trigger already made the row", async () => {
      await createUserAdmin(
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
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ id: USER_ID, ...details }),
      );
      expect(onConflictDoUpdate).toHaveBeenCalledWith(
         expect.objectContaining({
            set: expect.objectContaining(details),
         }),
      );
   });

   it("saves blank contact details as null", async () => {
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
      expect(generateLink).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
   });
});

describe("resendInviteAdmin", () => {
   function pendingUser(invitedAt: string) {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({ email_confirmed_at: null, invited_at: invitedAt }),
         },
         error: null,
      });
   }

   it("sends a fresh invitation link", async () => {
      pendingUser("2026-01-01T00:00:00Z");
      generateLink.mockResolvedValue(link("invite", "fresh-token"));

      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(generateLink).toHaveBeenCalledWith({
         type: "invite",
         email: "ada@example.com",
      });
      expect(sendInviteEmail).toHaveBeenCalledWith({
         to: "ada@example.com",
         firstName: "Ada",
         tokenHash: "fresh-token",
      });
      expect(result).toEqual({
         message: "Invitation re-sent to ada@example.com.",
      });
   });

   it("refuses users who already accepted", async () => {
      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/already accepted/);
      expect(generateLink).not.toHaveBeenCalled();
   });

   it("refuses people who signed up themselves", async () => {
      getUserById.mockResolvedValue({
         data: {
            user: authUser({ email_confirmed_at: null, invited_at: null }),
         },
         error: null,
      });

      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/signed up themselves/);
      expect(generateLink).not.toHaveBeenCalled();
   });

   it("waits a minute between invitations", async () => {
      pendingUser(new Date(Date.now() - 10_000).toISOString());

      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/once a minute/);
      expect(generateLink).not.toHaveBeenCalled();
   });

   it("reports a failed email", async () => {
      pendingUser("2026-01-01T00:00:00Z");
      sendInviteEmail.mockRejectedValue(new Error("SMTP down"));

      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/could not be sent/);
      expect(result?.errors?._form?.[0]).toMatch(
         /previous invitation link no longer works/,
      );
   });

   it("keeps the current link when the profile can't be read", async () => {
      pendingUser("2026-01-01T00:00:00Z");
      findFirst.mockRejectedValueOnce(new Error("db down"));

      await expect(
         resendInviteAdmin(null, formData({ user_id: USER_ID })),
      ).rejects.toThrow("db down");
      expect(generateLink).not.toHaveBeenCalled();
   });

   it("requires an admin", async () => {
      requireAdmin.mockRejectedValue(new Error("Forbidden"));

      const result = await resendInviteAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(getUserById).not.toHaveBeenCalled();
   });
});

describe("deleteUserAdmin notice", () => {
   it("captures the address first and notifies it after the deletion", async () => {
      const result = await deleteUserAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(calls).toEqual(["delete", "deleted notice"]);
      expect(sendAccountDeletedNotice).toHaveBeenCalledWith({
         to: "ada@example.com",
         firstName: "Ada",
      });
      expect(result).toEqual({ message: "User deleted." });
   });

   it("sends nothing when the deletion fails", async () => {
      deleteUser.mockResolvedValue({ error: { message: "nope" } });

      const result = await deleteUserAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result).toEqual({ errors: { _form: ["nope"] } });
      expect(sendAccountDeletedNotice).not.toHaveBeenCalled();
   });

   it("sends nothing to an address that was never verified", async () => {
      getUserById.mockResolvedValue({
         data: { user: authUser({ email_confirmed_at: null }) },
         error: null,
      });

      await deleteUserAdmin(null, formData({ user_id: USER_ID }));

      expect(deleteUser).toHaveBeenCalled();
      expect(sendAccountDeletedNotice).not.toHaveBeenCalled();
   });

   it("says so when the notice can't be delivered", async () => {
      sendAccountDeletedNotice.mockRejectedValue(new Error("SMTP down"));

      const result = await deleteUserAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result).toEqual({
         message: "User deleted, but the notification email couldn't be sent.",
      });
   });

   it("doesn't delete a coordinator who still has private lessons", async () => {
      selectLimit.mockResolvedValue([{ id: "service-1" }]);

      const result = await deleteUserAdmin(
         null,
         formData({ user_id: USER_ID }),
      );

      expect(result?.errors?._form?.[0]).toMatch(/assigned to one or more/);
      expect(deleteUser).not.toHaveBeenCalled();
      expect(sendAccountDeletedNotice).not.toHaveBeenCalled();
   });
});
