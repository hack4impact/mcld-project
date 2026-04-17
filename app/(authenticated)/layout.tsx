import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AuthenticatedLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   return (
      <TooltipProvider>
         <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
               <div className="flex flex-1 flex-col gap-4 p-4">
                  {children}
               </div>
            </SidebarInset>
         </SidebarProvider>
      </TooltipProvider>
   );
}
