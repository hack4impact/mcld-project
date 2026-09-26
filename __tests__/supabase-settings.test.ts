/**
 * @jest-environment node
 */
import { emailConfirmationRequired } from "@/lib/auth/supabase-settings";

jest.mock("server-only", () => ({}));

const fetchMock = jest.fn();
const env = { ...process.env };

beforeAll(() => {
   global.fetch = fetchMock as unknown as typeof fetch;
   process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY =
      "sb_publishable_x";
});
afterAll(() => {
   for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
   ] as const) {
      if (env[key] === undefined) delete process.env[key];
      else process.env[key] = env[key];
   }
});

function respond(status: number, body: unknown) {
   fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
   });
}

beforeEach(() => fetchMock.mockReset());

describe("emailConfirmationRequired", () => {
   it("reads Supabase's public auth settings", async () => {
      respond(200, { mailer_autoconfirm: false });

      await expect(emailConfirmationRequired()).resolves.toBe(true);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe("https://abc.supabase.co/auth/v1/settings");
      expect(init.headers).toEqual({ apikey: "sb_publishable_x" });
   });

   it("is false when Confirm email is off", async () => {
      respond(200, { mailer_autoconfirm: true });

      await expect(emailConfirmationRequired()).resolves.toBe(false);
   });

   it("fails closed when the setting is missing", async () => {
      respond(200, {});

      await expect(emailConfirmationRequired()).resolves.toBe(false);
   });

   it("throws when Supabase doesn't answer", async () => {
      respond(503, {});

      await expect(emailConfirmationRequired()).rejects.toThrow("503");
   });
});
