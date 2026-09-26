import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/utils/supabase/server";

// Handles PKCE `?code=` links (the Supabase default). Our email templates use
// /auth/confirm instead, which also works on a different device.
export async function GET(request: NextRequest) {
   const { searchParams } = request.nextUrl;
   const code = searchParams.get("code");
   const next = safeNextPath(searchParams.get("next"));

   let errorCode =
      searchParams.get("error_code") === "otp_expired"
         ? "link_expired"
         : "link_invalid";

   if (code && !searchParams.get("error_code")) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
         return NextResponse.redirect(new URL(next, request.url));
      }
      // Opened in another browser: Supabase already verified the email, but
      // this browser can't finish the sign-in.
      if (error.code === "pkce_code_verifier_not_found") {
         errorCode = "link_other_browser";
      }
   }

   const url = new URL("/login", request.url);
   url.searchParams.set("error", errorCode);
   return NextResponse.redirect(url);
}
