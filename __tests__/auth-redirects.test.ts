/**
 * @jest-environment node
 */
import { nextPathFromLink, safeNextPath } from "@/lib/auth/redirects";

describe("safeNextPath", () => {
   it.each([
      ["/", "/"],
      ["/checkout/abc", "/checkout/abc"],
      ["/checkout/abc?step=2#pay", "/checkout/abc?step=2#pay"],
      ["/users?role=admin&tab=all", "/users?role=admin&tab=all"],
   ])("keeps the internal path %s", (raw, expected) => {
      expect(safeNextPath(raw)).toBe(expected);
   });

   it.each([
      ["protocol-relative", "//evil.com"],
      ["backslash (browsers read it as /)", "/\\evil.com"],
      ["tab before a second slash", "/\t/evil.com"],
      ["newline", "/\nevil"],
      ["absolute URL", "https://evil.com/login"],
      ["javascript: URL", "javascript:alert(1)"],
      ["relative path", "checkout/abc"],
      ["userinfo trick", "@evil.com"],
      ["empty string", ""],
   ])("rejects %s", (_label, raw) => {
      expect(safeNextPath(raw)).toBe("/");
   });

   it("rejects non-strings and uses the given fallback", () => {
      expect(safeNextPath(null)).toBe("/");
      expect(safeNextPath(undefined, "/login")).toBe("/login");
      expect(safeNextPath(["/checkout"], "/login")).toBe("/login");
   });
});

describe("nextPathFromLink", () => {
   const originalAppUrl = process.env.APP_URL;
   beforeAll(() => {
      process.env.APP_URL = "https://app.mcld.example";
   });
   afterAll(() => {
      // Assigning undefined would store the string "undefined".
      if (originalAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = originalAppUrl;
   });

   it("turns {{ .RedirectTo }} on this app into a path", () => {
      expect(
         nextPathFromLink("https://app.mcld.example/checkout/abc?step=2"),
      ).toBe("/checkout/abc?step=2");
      expect(nextPathFromLink("https://app.mcld.example")).toBe("/");
   });

   it("accepts internal paths", () => {
      expect(nextPathFromLink("/checkout/abc")).toBe("/checkout/abc");
   });

   it.each([
      ["another site", "https://evil.example/checkout"],
      ["a lookalike host", "https://app.mcld.example.evil.example/"],
      ["plain http on this host", "http://app.mcld.example/checkout"],
      ["an unsafe path", "//evil.example"],
      ["garbage", "not a url"],
   ])("falls back to / for %s", (_label, raw) => {
      expect(nextPathFromLink(raw)).toBe("/");
   });
});
