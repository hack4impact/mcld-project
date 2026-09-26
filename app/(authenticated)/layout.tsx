import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import Image from "next/image";
import Link from "next/link";
import {
   SidebarInset,
   SidebarProvider,
   SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { getUserRole } from "@/lib/auth/require-admin";

async function AuthGate({ children }: { children: React.ReactNode }) {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   return <>{children}</>;
}

async function RoleAwareSidebar() {
   const supabase = await createClient();
   const [
      role,
      {
         data: { user },
      },
   ] = await Promise.all([getUserRole(), supabase.auth.getUser()]);

   const profile = user
      ? await db.query.profiles.findFirst({
           where: eq(profiles.id, user.id),
           columns: { firstName: true, lastName: true },
        })
      : undefined;

   const name = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : null;

   return (
      <AppSidebar
         role={role}
         viewer={user ? { name, email: user.email ?? "" } : null}
      />
   );
}

export default function AuthenticatedLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <TooltipProvider>
         <SidebarProvider>
            <Suspense fallback={null}>
               <RoleAwareSidebar />
            </Suspense>
            <SidebarInset className="h-svh min-h-0 overflow-hidden">
               <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-card/80 px-3 backdrop-blur md:hidden">
                  <SidebarTrigger />
                  <Link href="/" className="flex items-center">
                     <Image
                        src="/logo.png"
                        alt="Montréal Centre for Learning Disabilities"
                        width={200}
                        height={66}
                        className="h-8 w-auto"
                     />
                  </Link>
               </header>
               <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <Suspense fallback={null}>
                     <AuthGate>{children}</AuthGate>
                  </Suspense>
               </div>
            </SidebarInset>
         </SidebarProvider>
         <Toaster />
      </TooltipProvider>
   );
}
