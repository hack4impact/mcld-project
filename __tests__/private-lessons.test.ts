import { isCashSession } from "@/lib/private-lessons";

describe("isCashSession", () => {
   it("is true for out-of-band invoice ids", () => {
      expect(isCashSession("in_1ABC")).toBe(true);
   });

   it("is false for checkout session ids and missing ids", () => {
      expect(isCashSession("cs_test_1ABC")).toBe(false);
      expect(isCashSession(null)).toBe(false);
   });
});
