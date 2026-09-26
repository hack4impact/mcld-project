"use client";

import { useMemo } from "react";
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
   CalendarClock,
   Baby,
   LogOut,
   type LucideIcon,
} from "lucide-react";
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarSeparator,
   SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { canViewUsers, ROLES, type Role } from "@/lib/roles";
import { signout } from "@/app/login/actions";

type NavItem = {
   title: string;
   href: string;
   icon: LucideIcon;
};

const baseNavItems: NavItem[] = [
   { title: "Overview", href: "/", icon: LayoutGrid },
   { title: "Services", href: "/services", icon: BookOpen },
   { title: "Users", href: "/users", icon: Users },
   { title: "Finance", href: "/finance", icon: CreditCard },
   { title: "Memberships", href: "/memberships", icon: MonitorSmartphone },
   { title: "Forms", href: "/forms", icon: Form },
];

const coordinatorNavItems: NavItem[] = [
   { title: "Overview", href: "/", icon: LayoutGrid },
   { title: "Services", href: "/services", icon: BookOpen },
   {
      title: "Scheduled lessons",
      href: "/scheduled-lessons",
      icon: CalendarClock,
   },
];

const ACTIVE_ITEM_CLASS =
   "data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm data-active:shadow-primary/20 data-active:hover:bg-primary/90 data-active:hover:text-primary-foreground";

const ROLE_LABELS: Record<Role, string> = {
   [ROLES.ADMIN]: "Administrator",
   [ROLES.COORDINATOR]: "Coordinator",
   [ROLES.USER]: "Member",
};

export type SidebarViewer = {
   name: string | null;
   email: string;
};

function initials(viewer: SidebarViewer): string {
   const source = viewer.name?.trim() || viewer.email;
   const parts = source.split(/[\s@._-]+/).filter(Boolean);
   return (
      (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[1][0] : "")
   ).toUpperCase();
}

export function AppSidebar({
   className,
   role,
   viewer,
   ...props
}: Omit<React.ComponentProps<typeof Sidebar>, "role"> & {
   role?: Role | null;
   viewer?: SidebarViewer | null;
}) {
   const pathname = usePathname();

   const navItems = useMemo(() => {
      const showUsers = canViewUsers(role);
      const items = baseNavItems.filter(
         (item) => showUsers || item.href !== "/users",
      );
      if (role === ROLES.USER) {
         items.push({
            title: "My children",
            href: "/children",
            icon: Baby,
         });
      }
      return items;
   }, [role]);

   const isActive = (href: string) =>
      href === "/"
         ? pathname === "/"
         : pathname === href || pathname.startsWith(`${href}/`);

   return (
      <Sidebar
         variant="floating"
         collapsible="icon"
         className={cn("inset-y-3 h-auto data-[side=left]:left-3", className)}
         {...props}
      >
         <SidebarHeader className="flex h-20 flex-row items-center gap-2 px-4 group-data-[collapsible=icon]:h-16 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link
               href="/"
               className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden"
            >
               <Image
                  src="/logo.png"
                  alt="Montréal Centre for Learning Disabilities"
                  width={200}
                  height={66}
                  className="h-10 w-auto"
                  priority
               />
            </Link>
            <div className="group/logo relative hidden size-8 items-center justify-center group-data-[collapsible=icon]:flex">
               <Image
                  src="/small.png"
                  alt="MCLD"
                  width={197}
                  height={287}
                  className="h-7 w-auto transition-opacity duration-200 group-hover/logo:opacity-0"
                  priority
               />
               <SidebarTrigger className="absolute inset-0 size-8 opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100" />
            </div>
            <SidebarTrigger className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
         </SidebarHeader>

         <SidebarContent>
            <SidebarGroup>
               <SidebarGroupLabel className="px-3 text-[0.7rem] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Menu
               </SidebarGroupLabel>
               <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                     {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                           <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                 asChild
                                 isActive={active}
                                 tooltip={item.title}
                                 className={cn("px-3", ACTIVE_ITEM_CLASS)}
                              >
                                 <Link href={item.href}>
                                    <item.icon
                                       className={cn(
                                          active
                                             ? "text-brand-gold"
                                             : "text-muted-foreground",
                                       )}
                                    />
                                    <span>{item.title}</span>
                                 </Link>
                              </SidebarMenuButton>
                           </SidebarMenuItem>
                        );
                     })}
                  </SidebarMenu>
               </SidebarGroupContent>
            </SidebarGroup>
         </SidebarContent>

         <SidebarFooter className="gap-2 pb-3">
            <SidebarMenu>
               <SidebarMenuItem>
                  <SidebarMenuButton
                     asChild
                     isActive={isActive("/settings")}
                     tooltip="Settings"
                     className={cn("px-3", ACTIVE_ITEM_CLASS)}
                  >
                     <Link href="/settings">
                        <Settings
                           className={cn(
                              isActive("/settings")
                                 ? "text-brand-gold"
                                 : "text-muted-foreground",
                           )}
                        />
                        <span>Settings</span>
                     </Link>
                  </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>

            {viewer && (
               <>
                  <SidebarSeparator className="mx-0" />
                  <div className="flex items-center gap-3 rounded-xl p-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                     <Avatar className="size-9 shrink-0 group-data-[collapsible=icon]:size-8">
                        <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                           {initials(viewer)}
                        </AvatarFallback>
                     </Avatar>
                     <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <p className="truncate text-sm font-semibold text-foreground">
                           {viewer.name || viewer.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                           {role ? ROLE_LABELS[role] : viewer.email}
                        </p>
                     </div>
                     <form className="group-data-[collapsible=icon]:hidden">
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 formAction={signout}
                                 aria-label="Sign out"
                                 className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                 <LogOut className="size-4" />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent side="right">
                              Sign out
                           </TooltipContent>
                        </Tooltip>
                     </form>
                  </div>
               </>
            )}
         </SidebarFooter>
      </Sidebar>
   );
}
