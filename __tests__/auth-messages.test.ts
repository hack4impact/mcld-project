/**
 * @jest-environment node
 */
import { authErrorMessage, authNoticeMessage } from "@/lib/auth/messages";

describe("auth messages", () => {
   it("maps known codes to fixed text", () => {
      expect(authErrorMessage("link_expired")).toMatch(/expired/);
      expect(authNoticeMessage("password_updated")).toMatch(
         /password was changed/,
      );
   });

   it("never echoes an unknown error code", () => {
      expect(authErrorMessage("<b>Call us at 555</b>")).toBe(
         "Something went wrong. Please try again.",
      );
   });

   it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
      "treats the built-in property %s as unknown",
      (code) => {
         expect(authErrorMessage(code)).toBe(
            "Something went wrong. Please try again.",
         );
         expect(authNoticeMessage(code)).toBeNull();
      },
   );

   it("shows nothing without a code", () => {
      expect(authErrorMessage(null)).toBeNull();
      expect(authNoticeMessage(null)).toBeNull();
   });
});
