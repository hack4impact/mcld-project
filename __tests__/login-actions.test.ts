/**
 * @jest-environment node
 */
import { login, resendConfirmation, signup } from "@/app/login/actions";

const signInWithPassword = jest.fn();
const signUp = jest.fn();
const resend = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({
      auth: {
         signInWithPassword: (...args: unknown[]) =>
            signInWithPassword(...args),
         signUp: (...args: unknown[]) => signUp(...args),
         resend: (...args: unknown[]) => resend(...args),
      },
   }),
}));

jest.mock("@/lib/db", () => ({
   db: {
      query: { profiles: { findFirst: jest.fn().mockResolvedValue(null) } },
   },
}));

jest.mock("next/navigation", () => ({
   redirect: (url: string) => {
      throw new Error(`REDIRECT:${url}`);
   },
}));

function form(fields: Record<string, string>) {
   const fd = new FormData();
   for (const [key, value] of Object.entries(fields)) fd.append(key, value);
   return fd;
}

const signupForm = (fields: Record<string, string> = {}) =>
   form({
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      next: "/checkout/prod_1",
      ...fields,
   });

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
   signUp.mockResolvedValue({ data: { user: {}, session: null }, error: null });
   resend.mockResolvedValue({ data: {}, error: null });
});

describe("signup", () => {
   it("asks the person to check their email, keeping where they came from", async () => {
      const result = await signup(null, signupForm());

      expect(signUp).toHaveBeenCalledWith({
         email: "ada@example.com",
         password: "correct-horse",
         options: {
            data: { first_name: "Ada", last_name: "Lovelace" },
            emailRedirectTo: "https://app.mcld.example/checkout/prod_1",
         },
      });
      expect(result).toEqual({ errors: {}, checkEmail: "ada@example.com" });
   });

   it("never puts an outside next URL into the confirmation link", async () => {
      await signup(null, signupForm({ next: "//evil.example" }));

      expect(signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
         "https://app.mcld.example/",
      );
   });

   it("goes straight in when Supabase doesn't require confirmation", async () => {
      signUp.mockResolvedValue({
         data: { user: {}, session: { access_token: "a" } },
         error: null,
      });

      await expect(signup(null, signupForm())).rejects.toThrow(
         "REDIRECT:/checkout/prod_1",
      );
   });

   it("needs a password of at least 8 characters", async () => {
      const result = await signup(null, signupForm({ password: "short12" }));

      expect(result?.errors.password).toEqual([
         "Password must be at least 8 characters",
      ]);
      expect(signUp).not.toHaveBeenCalled();
   });

   it("explains rate limits in plain words", async () => {
      signUp.mockResolvedValue({
         data: { user: null, session: null },
         error: {
            code: "over_email_send_rate_limit",
            message: "email rate limit exceeded",
         },
      });

      const result = await signup(null, signupForm());

      expect(result?.errors.email?.[0]).toMatch(/Too many attempts/);
   });
});

describe("login", () => {
   it("offers a new confirmation email when the address isn't confirmed", async () => {
      signInWithPassword.mockResolvedValue({
         data: { user: null, session: null },
         error: { code: "email_not_confirmed", message: "Email not confirmed" },
      });

      const result = await login(
         null,
         form({ email: "ada@example.com", password: "whatever1" }),
      );

      expect(result?.unconfirmedEmail).toBe("ada@example.com");
      expect(result?.errors.email?.[0]).toMatch(/Confirm your email/);
   });

   it("still lets old 6-character passwords log in", async () => {
      signInWithPassword.mockResolvedValue({
         data: { user: { id: "u1" }, session: {} },
         error: null,
      });

      await expect(
         login(
            null,
            form({
               email: "ada@example.com",
               password: "abc123",
               next: "/users",
            }),
         ),
      ).rejects.toThrow("REDIRECT:/users");
      expect(signInWithPassword).toHaveBeenCalledWith({
         email: "ada@example.com",
         password: "abc123",
      });
   });

   it.each(["/\\evil.example", "/.//evil.example", "/%2e%2e//evil.example"])(
      "won't redirect off-site to %s after logging in",
      async (next) => {
         signInWithPassword.mockResolvedValue({
            data: { user: { id: "u1" }, session: {} },
            error: null,
         });

         await expect(
            login(
               null,
               form({ email: "ada@example.com", password: "abc123", next }),
            ),
         ).rejects.toThrow(/^REDIRECT:\/$/);
      },
   );
});

describe("resendConfirmation", () => {
   it("resends the signup link back to the same page", async () => {
      const result = await resendConfirmation(
         null,
         form({ email: "ada@example.com", next: "/checkout/prod_1" }),
      );

      expect(resend).toHaveBeenCalledWith({
         type: "signup",
         email: "ada@example.com",
         options: {
            emailRedirectTo: "https://app.mcld.example/checkout/prod_1",
         },
      });
      expect(result).toEqual({
         errors: {},
         checkEmail: "ada@example.com",
         resent: true,
      });
   });

   it("answers the same way when Supabase refuses", async () => {
      resend.mockResolvedValue({
         data: {},
         error: {
            code: "over_email_send_rate_limit",
            status: 429,
            message: "wait",
         },
      });
      jest.spyOn(console, "error").mockImplementation(() => undefined);

      const result = await resendConfirmation(
         null,
         form({ email: "ada@example.com" }),
      );

      expect(result).toEqual({
         errors: {},
         checkEmail: "ada@example.com",
         resent: true,
      });
   });
});
