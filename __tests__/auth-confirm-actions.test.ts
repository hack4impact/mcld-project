/**
 * @jest-environment node
 */
import { confirmEmailLink } from "@/app/auth/confirm/actions";

const signOut = jest.fn();
const verifyOtp = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({
      auth: {
         signOut: (...args: unknown[]) => signOut(...args),
         verifyOtp: (...args: unknown[]) => verifyOtp(...args),
      },
   }),
}));

const findAccountByEmail = jest.fn();
const sendEmailChangedNotices = jest.fn();
jest.mock("@/lib/auth/account-emails", () => ({
   findAccountByEmail: (...args: unknown[]) => findAccountByEmail(...args),
   sendEmailChangedNotices: (...args: unknown[]) =>
      sendEmailChangedNotices(...args),
   sendNotice: async (_label: string, send: () => Promise<void>) => {
      try {
         await send();
         return true;
      } catch {
         return false;
      }
   },
}));

jest.mock("next/navigation", () => ({
   redirect: (url: string) => {
      throw new Error(`REDIRECT:${url}`);
   },
}));

const USER_ID = "3f0c2a5e-8a4b-4d6e-9f1a-2b3c4d5e6f70";
const session = { access_token: "a", refresh_token: "r" };

function form(fields: Record<string, string>) {
   const fd = new FormData();
   for (const [key, value] of Object.entries(fields)) fd.append(key, value);
   return fd;
}

const originalAppUrl = process.env.APP_URL;
beforeAll(() => {
   process.env.APP_URL = "https://app.mcld.example";
});
afterAll(() => {
   if (originalAppUrl === undefined) delete process.env.APP_URL;
   else process.env.APP_URL = originalAppUrl;
});

beforeEach(() => {
   jest.clearAllMocks();
   signOut.mockResolvedValue({ error: null });
   verifyOtp.mockResolvedValue({
      data: { user: { id: USER_ID, email: "ada@example.com" }, session },
      error: null,
   });
   findAccountByEmail.mockResolvedValue({
      id: USER_ID,
      email: "ada@example.com",
      firstName: "Ada",
   });
   sendEmailChangedNotices.mockResolvedValue(undefined);
});

describe("confirmEmailLink", () => {
   it("rejects unknown link types without calling Supabase", async () => {
      await expect(
         confirmEmailLink(null, form({ type: "magiclink", token_hash: "t" })),
      ).resolves.toEqual({ status: "invalid", type: null });
      expect(verifyOtp).not.toHaveBeenCalled();
   });

   it("signs out any other account, verifies, and returns to where signup started", async () => {
      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email",
               token_hash: "pkce_abc",
               next: "https://app.mcld.example/checkout/prod_1",
            }),
         ),
      ).rejects.toThrow("REDIRECT:/checkout/prod_1");

      expect(signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(
         verifyOtp.mock.invocationCallOrder[0]!,
      );
      expect(verifyOtp).toHaveBeenCalledWith({
         type: "email",
         token_hash: "pkce_abc",
      });
   });

   it("won't follow a next URL on another site", async () => {
      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email",
               token_hash: "abc",
               next: "https://evil.example/phish",
            }),
         ),
      ).rejects.toThrow("REDIRECT:/");
   });

   it.each([
      ["invite", "/auth/set-password"],
      ["recovery", "/auth/reset-password"],
   ])("sends %s links to %s", async (type, path) => {
      await expect(
         confirmEmailLink(null, form({ type, token_hash: "abc" })),
      ).rejects.toThrow(`REDIRECT:${path}`);
   });

   it.each([
      [{ code: "otp_expired", status: 403 }, "expired"],
      [{ code: "validation_failed", status: 400 }, "invalid"],
      [{ code: "over_request_rate_limit", status: 429 }, "error"],
      [{ code: undefined, status: 500 }, "error"],
   ])("reports %j as %s", async (error, status) => {
      verifyOtp.mockResolvedValue({
         data: { user: null, session: null },
         error: { message: "nope", ...error },
      });

      await expect(
         confirmEmailLink(null, form({ type: "recovery", token_hash: "abc" })),
      ).resolves.toEqual({ status, type: "recovery" });
   });

   it("keeps the current session while an email change waits for the other address", async () => {
      verifyOtp.mockResolvedValue({
         data: { user: { msg: "Confirmation link accepted" }, session: null },
         error: null,
      });

      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email_change",
               token_hash: "abc",
               email: "ada@example.com",
            }),
         ),
      ).resolves.toEqual({ status: "email_change_pending" });
      expect(signOut).not.toHaveBeenCalled();
      expect(sendEmailChangedNotices).not.toHaveBeenCalled();
   });

   it("notifies both addresses once the change completes", async () => {
      verifyOtp.mockResolvedValue({
         data: { user: { id: USER_ID, email: "ada@new.example.com" }, session },
         error: null,
      });

      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email_change",
               token_hash: "abc",
               email: "ada@example.com",
            }),
         ),
      ).resolves.toEqual({ status: "email_changed" });
      expect(findAccountByEmail).toHaveBeenCalledWith("ada@example.com");
      expect(sendEmailChangedNotices).toHaveBeenCalledWith({
         firstName: "Ada",
         oldEmail: "ada@example.com",
         newEmail: "ada@new.example.com",
      });
   });

   it("ignores an email parameter that belongs to a different account", async () => {
      findAccountByEmail.mockResolvedValue({
         id: "someone-else",
         email: "victim@example.com",
         firstName: "Vic",
      });
      verifyOtp.mockResolvedValue({
         data: { user: { id: USER_ID, email: "ada@new.example.com" }, session },
         error: null,
      });

      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email_change",
               token_hash: "abc",
               email: "victim@example.com",
            }),
         ),
      ).resolves.toEqual({ status: "email_changed" });
      expect(sendEmailChangedNotices).not.toHaveBeenCalled();
   });

   it("still confirms when the completion notice can't be delivered", async () => {
      verifyOtp.mockResolvedValue({
         data: { user: { id: USER_ID, email: "ada@new.example.com" }, session },
         error: null,
      });
      sendEmailChangedNotices.mockRejectedValue(new Error("SMTP down"));

      await expect(
         confirmEmailLink(
            null,
            form({
               type: "email_change",
               token_hash: "abc",
               email: "ada@example.com",
            }),
         ),
      ).resolves.toEqual({ status: "email_changed" });
   });
});
