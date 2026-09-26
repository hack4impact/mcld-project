/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

const exchangeCodeForSession = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({
      auth: {
         exchangeCodeForSession: (...args: unknown[]) =>
            exchangeCodeForSession(...args),
      },
   }),
}));

function request(query: string) {
   return new NextRequest(`http://localhost:3000/auth/callback${query}`);
}

beforeEach(() => {
   jest.clearAllMocks();
   exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
   it("signs in and goes to the requested page", async () => {
      const res = await GET(request("?code=abc&next=/checkout/prod_1"));

      expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
      expect(res.headers.get("location")).toBe(
         "http://localhost:3000/checkout/prod_1",
      );
   });

   it.each(["//evil.example", "/\\evil.example", "https://evil.example"])(
      "won't redirect to %s",
      async (next) => {
         const res = await GET(
            request(`?code=abc&next=${encodeURIComponent(next)}`),
         );
         expect(res.headers.get("location")).toBe("http://localhost:3000/");
      },
   );

   it("shows an expired link on the login page", async () => {
      const res = await GET(
         request("?error=access_denied&error_code=otp_expired&code=abc"),
      );

      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(res.headers.get("location")).toBe(
         "http://localhost:3000/login?error=link_expired",
      );
   });

   it("explains a link opened in another browser", async () => {
      exchangeCodeForSession.mockResolvedValue({
         error: { code: "pkce_code_verifier_not_found", message: "missing" },
      });

      const res = await GET(request("?code=abc"));

      expect(res.headers.get("location")).toBe(
         "http://localhost:3000/login?error=link_other_browser",
      );
   });

   it("reports any other failure as an invalid link", async () => {
      exchangeCodeForSession.mockResolvedValue({
         error: { code: "flow_state_not_found", message: "nope" },
      });

      const res = await GET(request("?code=abc"));
      expect(res.headers.get("location")).toBe(
         "http://localhost:3000/login?error=link_invalid",
      );

      const noCode = await GET(request(""));
      expect(noCode.headers.get("location")).toBe(
         "http://localhost:3000/login?error=link_invalid",
      );
   });
});
