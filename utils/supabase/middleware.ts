import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";

const ADMIN_AREA_PREFIXES = [
   "/services",
   "/users",
   "/finance",
   "/memberships",
   "/forms",
   "/discounts",
   "/settings",
];

function isAdminAreaPath(pathname: string): boolean {
   return ADMIN_AREA_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
   );
}

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
      !request.nextUrl.pathname.startsWith("/scheduling") &&
      !request.nextUrl.pathname.startsWith("/api/webhooks") &&
      !request.nextUrl.pathname.startsWith("/api/public")
   ) {
      const url = request.nextUrl.clone();
      const originalPath = request.nextUrl.pathname + request.nextUrl.search;
      url.pathname = "/login";
      url.search = "";
      if (originalPath && originalPath !== "/") {
         url.searchParams.set("next", originalPath);
      }
      return NextResponse.redirect(url);
   }

   if (isAdminAreaPath(request.nextUrl.pathname)) {
      const { data: claimsData } = await supabase.auth.getClaims();
      if (claimsData?.claims?.user_role === ROLES.USER) {
         const url = request.nextUrl.clone();
         url.pathname = "/account";
         url.search = "";
         return NextResponse.redirect(url);
      }
   }

   return supabaseResponse;
}
