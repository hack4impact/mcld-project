import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";

export async function updateSession(request: NextRequest) {
   let supabaseResponse = NextResponse.next({
      request,
   });

   const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
         cookies: {
            getAll() {
               return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
               cookiesToSet.forEach(({ name, value }) =>
                  request.cookies.set(name, value),
               );
               supabaseResponse = NextResponse.next({
                  request,
               });
               cookiesToSet.forEach(({ name, value, options }) =>
                  supabaseResponse.cookies.set(name, value, options),
               );
            },
         },
      },
   );

   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (
      !user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/api/webhooks")
   ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
   }

   // Protect /dashboard/* — admin only
   if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const role = claimsData?.claims?.user_role;
      if (role !== ROLES.ADMIN) {
         const url = request.nextUrl.clone();
         url.pathname = "/";
         return NextResponse.redirect(url);
      }
   }

   return supabaseResponse;
}
