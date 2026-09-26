/**
 * @jest-environment node
 */
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { requestPasswordReset } from "@/app/auth/forgot-password/actions";
import { resetPassword } from "@/app/auth/reset-password/actions";
import { setInvitePassword } from "@/app/auth/set-password/actions";

const resetPasswordForEmail = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({
      auth: {
         resetPasswordForEmail: (...args: unknown[]) =>
            resetPasswordForEmail(...args),
      },
   }),
}));

const updateUser = jest.fn();
const signOut = jest.fn();
const getUser = jest.fn();
const getFreshLinkSession = jest.fn();
jest.mock("@/lib/auth/link-session", () => ({
   ...jest.requireActual("@/lib/auth/link-session"),
   getFreshLinkSession: (...args: unknown[]) => getFreshLinkSession(...args),
}));

const sendPasswordChangedNotice = jest.fn();
jest.mock("@/lib/auth/account-emails", () => ({
   sendPasswordChangedNotice: (...args: unknown[]) =>
      sendPasswordChangedNotice(...args),
   sendNotice: async (_label: string, send: () => Promise<void>) => {
      try {
         await send();
         return true;
      } catch {
         return false;
      }
   },
}));

jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: jest.fn().mockResolvedValue({ firstName: "Ada" }),
         },
      },
   },
}));

jest.mock("next/navigation", () => ({
   redirect: (url: string) => {
      throw new Error(`REDIRECT:${url}`);
   },
}));

const USER_ID = "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70";

function form(fields: Record<string, string>) {
   const fd = new FormData();
   for (const [key, value] of Object.entries(fields)) fd.append(key, value);
   return fd;
}

const passwords = (password = "brand-new-pass", confirm = password) =>
   form({ password, confirm_password: confirm, user_id: "someone-else" });

beforeEach(() => {
   jest.clearAllMocks();
   resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
   updateUser.mockResolvedValue({ data: {}, error: null });
   signOut.mockResolvedValue({ error: null });
   getUser.mockResolvedValue({
      data: {
         user: {
            id: USER_ID,
            invited_at: "2026-09-01T00:00:00Z",
            email_confirmed_at: new Date(Date.now() - 60_000).toISOString(),
         },
      },
   });
   sendPasswordChangedNotice.mockResolvedValue(undefined);
   getFreshLinkSession.mockResolvedValue({
      supabase: { auth: { updateUser, signOut, getUser } },
      userId: USER_ID,
      email: "ada@example.com",
   });
});

describe("requestPasswordReset", () => {
   it("sends a reset link and says it may have been sent", async () => {
      const result = await requestPasswordReset(
         null,
         form({ email: " ada@example.com " }),
      );

      expect(resetPasswordForEmail).toHaveBeenCalledWith("ada@example.com", {
         redirectTo: expect.stringMatching(
            /\/auth\/callback\?next=\/auth\/reset-password$/,
         ),
      });
      expect(result).toEqual({ sent: true, email: "ada@example.com" });
   });

   it("gives the same answer when Supabase refuses", async () => {
      resetPasswordForEmail.mockResolvedValue({
         data: null,
         error: {
            code: "over_email_send_rate_limit",
            status: 429,
            message: "wait",
         },
      });
      jest.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(
         requestPasswordReset(null, form({ email: "ada@example.com" })),
      ).resolves.toEqual({ sent: true, email: "ada@example.com" });
   });

   it("says so when the email can't be sent right now", async () => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      for (const error of [
         { code: "over_request_rate_limit", status: 429, message: "slow down" },
         new AuthRetryableFetchError("fetch failed", 0),
      ]) {
         resetPasswordForEmail.mockResolvedValueOnce({ data: null, error });

         await expect(
            requestPasswordReset(null, form({ email: "ada@example.com" })),
         ).resolves.toEqual({
            errors: {
               email: [
                  "We couldn't send the email right now. Please try again in a few minutes.",
               ],
            },
         });
      }
   });

   it("checks the address format before calling Supabase", async () => {
      const result = await requestPasswordReset(
         null,
         form({ email: "not-an-email" }),
      );

      expect(result).toEqual({ errors: { email: ["Invalid email address"] } });
      expect(resetPasswordForEmail).not.toHaveBeenCalled();
   });
});

describe("resetPassword", () => {
   it("changes the password, signs out everywhere, notifies, and returns to login", async () => {
      await expect(resetPassword(null, passwords())).rejects.toThrow(
         "REDIRECT:/login?notice=password_updated",
      );

      expect(updateUser).toHaveBeenCalledWith({ password: "brand-new-pass" });
      expect(signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(sendPasswordChangedNotice).toHaveBeenCalledWith({
         to: "ada@example.com",
         firstName: "Ada",
      });
   });

   it("needs a fresh session from a reset link", async () => {
      getFreshLinkSession.mockResolvedValue(null);

      const result = await resetPassword(null, passwords());

      expect(result?.errors._form?.[0]).toMatch(/expired/);
      expect(updateUser).not.toHaveBeenCalled();
   });

   it("checks the new password before changing anything", async () => {
      const tooShort = await resetPassword(null, passwords("short"));
      expect(tooShort?.errors.password).toEqual([
         "Password must be at least 8 characters",
      ]);

      const mismatch = await resetPassword(
         null,
         passwords("brand-new-pass", "brand-new-pas"),
      );
      expect(mismatch?.errors.confirm_password).toEqual([
         "Passwords do not match",
      ]);
      expect(updateUser).not.toHaveBeenCalled();
   });

   it("explains reusing the current password, without signing out or notifying", async () => {
      updateUser.mockResolvedValue({
         data: {},
         error: { code: "same_password", message: "same" },
      });

      const result = await resetPassword(null, passwords());

      expect(result?.errors.password?.[0]).toMatch(/different password/);
      expect(signOut).not.toHaveBeenCalled();
      expect(sendPasswordChangedNotice).not.toHaveBeenCalled();
   });

   it("still finishes when the notice can't be delivered", async () => {
      sendPasswordChangedNotice.mockRejectedValue(new Error("SMTP down"));

      await expect(resetPassword(null, passwords())).rejects.toThrow(
         "REDIRECT:/login?notice=password_updated",
      );
   });
});

describe("setInvitePassword", () => {
   it("sets the first password and continues into the app", async () => {
      await expect(setInvitePassword(null, passwords())).rejects.toThrow(
         /^REDIRECT:\/$/,
      );

      expect(updateUser).toHaveBeenCalledWith({ password: "brand-new-pass" });
      expect(signOut).not.toHaveBeenCalled();
   });

   it("needs a fresh session from an invitation link", async () => {
      getFreshLinkSession.mockResolvedValue(null);

      const result = await setInvitePassword(null, passwords());

      expect(result?.errors._form?.[0]).toMatch(/expired/);
      expect(updateUser).not.toHaveBeenCalled();
   });

   it("is only for invited accounts", async () => {
      getUser.mockResolvedValue({
         data: {
            user: {
               id: USER_ID,
               invited_at: null,
               email_confirmed_at: new Date().toISOString(),
            },
         },
      });

      const result = await setInvitePassword(null, passwords());

      expect(result?.errors._form?.[0]).toMatch(/Forgot password/);
      expect(updateUser).not.toHaveBeenCalled();
   });

   it("won't change the password of an invitation accepted long ago", async () => {
      getUser.mockResolvedValue({
         data: {
            user: {
               id: USER_ID,
               invited_at: "2026-01-01T00:00:00Z",
               email_confirmed_at: "2026-01-01T00:05:00Z",
            },
         },
      });

      const result = await setInvitePassword(null, passwords());

      expect(result?.errors._form?.[0]).toMatch(/Forgot password/);
      expect(updateUser).not.toHaveBeenCalled();
   });
});
