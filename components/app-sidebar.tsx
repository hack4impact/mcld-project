"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
   LayoutGrid,
   BookOpen,
   Users,
   CreditCard,
   MonitorSmartphone,
   Settings,
   Form,
} from "lucide-react";
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarTrigger,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { cn } from "@/lib/utils";

const navItems = [
   { title: "OVERVIEW", href: "/", icon: LayoutGrid },
   { title: "SERVICES", href: "/services", icon: BookOpen },
   { title: "USERS", href: "/users", icon: Users },
   { title: "FINANCE", href: "/finance", icon: CreditCard },
   { title: "MEMBERSHIPS", href: "/memberships", icon: MonitorSmartphone },
   { title: "FORMS" , href: "/forms", icon: Form}
];

export function AppSidebar({
   className,
   ...props
}: React.ComponentProps<typeof Sidebar>) {
   const pathname = usePathname();

   return (
      <Sidebar
         variant="floating"
         collapsible="icon"
         className={cn("data-[side=left]:left-3 inset-y-3 h-auto", className)}
         {...props}
      >
         <SidebarHeader className="flex flex-row items-center gap-2 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-b group-data-[collapsible=icon]:border-b-gray-700">
            <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
               <Image src="/logo.png" alt="Logo" width={200} height={200} />
            </div>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:m-0 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex" />
         </SidebarHeader>
         <SidebarContent>
            <SidebarGroup>
               <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                     {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                           <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                 asChild
                                 isActive={isActive}
                                 size="sm"
                                 className={
                                    isActive
                                       ? "border-l-3 border-yellow-400 font-semibold"
                                       : ""
                                 }
                              >
                                 <Link href={item.href}>
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-sm font-medium tracking-wide">
                                       {item.title}
                                    </span>
                                 </Link>
                              </SidebarMenuButton>
                           </SidebarMenuItem>
                        );
                     })}
                  </SidebarMenu>
               </SidebarGroupContent>
            </SidebarGroup>
         </SidebarContent>
         <SidebarFooter>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
               <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium tracking-wide">
                     Settings
                  </span>
               </Link>
            </SidebarMenuButton>
         </SidebarFooter>
      </Sidebar>
   );
}
