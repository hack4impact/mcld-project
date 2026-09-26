/**
 * @jest-environment node
 */
import { latestEmailLinkVerification } from "@/lib/auth/link-session";

jest.mock("server-only", () => ({}));
jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn() }));

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
