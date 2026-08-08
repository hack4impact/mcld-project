import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import type { Role } from "@/lib/roles";

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
   const { data: claimsData } = await supabase.auth.getClaims();
   const role = (claimsData?.claims?.user_role as Role | undefined) ?? null;
   return <AppSidebar role={role} />;
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
            <SidebarInset>
               <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
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
