/**
 * @jest-environment node
 */
import {
   acceptedInviteRecently,
   getFreshLinkSession,
   latestEmailLinkVerification,
} from "@/lib/auth/link-session";

jest.mock("server-only", () => ({}));

const getClaims = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getClaims } }),
}));

const now = () => Math.floor(Date.now() / 1000);

describe("latestEmailLinkVerification", () => {
   it("returns the newest email-link timestamp", () => {
      expect(
         latestEmailLinkVerification([
            { method: "password", timestamp: 300 },
            { method: "otp", timestamp: 200 },
            { method: "recovery", timestamp: 100 },
         ]),
      ).toBe(200);
   });

   it("ignores sessions that only used a password", () => {
      expect(
         latestEmailLinkVerification([{ method: "password", timestamp: 300 }]),
      ).toBeNull();
   });

   it.each([
      ["missing", undefined],
      ["plain strings (no timestamps)", ["otp"]],
      ["not an array", { method: "otp", timestamp: 1 }],
      ["a bad timestamp", [{ method: "otp", timestamp: "1" }]],
   ])("fails closed on %s", (_label, amr) => {
      expect(latestEmailLinkVerification(amr)).toBeNull();
   });
});

describe("getFreshLinkSession", () => {
   function claims(amr: unknown) {
      getClaims.mockResolvedValue({
         data: { claims: { sub: "u1", email: "ada@example.com", amr } },
         error: null,
      });
   }

   it("accepts a session from an email link opened a few minutes ago", async () => {
      claims([{ method: "otp", timestamp: now() - 5 * 60 }]);

      await expect(getFreshLinkSession()).resolves.toMatchObject({
         userId: "u1",
         email: "ada@example.com",
      });
   });

   it("rejects one that's more than 30 minutes old", async () => {
      claims([{ method: "otp", timestamp: now() - 31 * 60 }]);

      await expect(getFreshLinkSession()).resolves.toBeNull();
   });

   it("rejects a password sign-in", async () => {
      claims([{ method: "password", timestamp: now() }]);

      await expect(getFreshLinkSession()).resolves.toBeNull();
   });

   it("rejects when there's no valid session", async () => {
      getClaims.mockResolvedValue({
         data: null,
         error: new Error("no session"),
      });

      await expect(getFreshLinkSession()).resolves.toBeNull();
   });
});

describe("acceptedInviteRecently", () => {
   const at = Date.parse("2026-09-26T12:00:00Z");

   it("is true within 30 minutes of accepting", () => {
      expect(
         acceptedInviteRecently(
            {
               invited_at: "2026-09-26T11:00:00Z",
               email_confirmed_at: "2026-09-26T11:45:00Z",
            },
            at,
         ),
      ).toBe(true);
   });

   it.each([
      [
         "accepted long ago",
         {
            invited_at: "2026-09-01T00:00:00Z",
            email_confirmed_at: "2026-09-01T00:05:00Z",
         },
      ],
      ["never invited", { email_confirmed_at: "2026-09-26T11:59:00Z" }],
      ["not accepted", { invited_at: "2026-09-26T11:59:00Z" }],
   ])("is false when %s", (_label, user) => {
      expect(acceptedInviteRecently(user, at)).toBe(false);
   });

   it("is false without a user", () => {
      expect(acceptedInviteRecently(null, at)).toBe(false);
   });
});
