"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Collapsible } from "radix-ui";
import {
   LayoutGrid,
   BookOpen,
   Users,
   CreditCard,
   MonitorSmartphone,
   Settings,
   Form,
   CalendarCheck,
   Baby,
   Receipt,
   UserRound,
   ChevronRight,
   type LucideIcon,
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
   SidebarMenuSub,
   SidebarMenuSubButton,
   SidebarMenuSubItem,
   SidebarTrigger,
   useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAdminRole, ROLES, type Role } from "@/lib/roles";

type NavLink = { title: string; href: string; icon: LucideIcon };
type NavGroup = { title: string; icon: LucideIcon; children: NavLink[] };
type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
   return "children" in entry;
}

const ADMIN_NAV: NavEntry[] = [
   { title: "OVERVIEW", href: "/", icon: LayoutGrid },
   { title: "SERVICES", href: "/services", icon: BookOpen },
   { title: "USERS", href: "/users", icon: Users },
   { title: "FINANCE", href: "/finance", icon: CreditCard },
   { title: "MEMBERSHIPS", href: "/memberships", icon: MonitorSmartphone },
   { title: "FORMS", href: "/forms", icon: Form },
];

const USER_NAV: NavEntry[] = [
   { title: "OVERVIEW", href: "/account", icon: LayoutGrid },
   {
      title: "MY ACCOUNT",
      icon: UserRound,
      children: [
         { title: "Bookings", href: "/account/bookings", icon: CalendarCheck },
         { title: "Children", href: "/account/children", icon: Baby },
         {
            title: "Transactions",
            href: "/account/transactions",
            icon: Receipt,
         },
         { title: "Profile", href: "/account/profile", icon: Settings },
      ],
   },
];

function isNavItemActive(pathname: string, href: string): boolean {
   if (href === "/" || href === "/account") return pathname === href;
   return pathname === href || pathname.startsWith(`${href}/`);
}

const ACTIVE_LEAF_CLASS =
   "translate-x-0.5 bg-white text-sidebar-accent-foreground shadow-sm hover:bg-white data-active:bg-white data-active:text-sidebar-accent-foreground";

function NavLinkItem({ item, pathname }: { item: NavLink; pathname: string }) {
   const isActive = isNavItemActive(pathname, item.href);

   return (
      <SidebarMenuItem>
         <SidebarMenuButton
            asChild
            isActive={isActive}
            size="sm"
            className={cn(
               "transition-[transform,background-color,box-shadow]",
               isActive && ACTIVE_LEAF_CLASS,
            )}
         >
            <Link href={item.href}>
               <item.icon className="h-5 w-5" />
               <span
                  className={cn(
                     "text-sm font-medium tracking-wide",
                     isActive && "font-semibold",
                  )}
               >
                  {item.title}
               </span>
            </Link>
         </SidebarMenuButton>
      </SidebarMenuItem>
   );
}

function NavGroupItem({
   item,
   pathname,
}: {
   item: NavGroup;
   pathname: string;
}) {
   const { state, setOpen: setSidebarOpen } = useSidebar();
   const hasActiveChild = item.children.some((child) =>
      isNavItemActive(pathname, child.href),
   );
   const [open, setOpen] = React.useState(hasActiveChild);
   const isIconMode = state === "collapsed";

   React.useEffect(() => {
      if (hasActiveChild) setOpen(true);
   }, [hasActiveChild]);

   return (
      <Collapsible.Root
         open={open}
         onOpenChange={(next) => setOpen(isIconMode ? true : next)}
         asChild
      >
         <SidebarMenuItem>
            <Collapsible.Trigger asChild>
               <SidebarMenuButton
                  size="sm"
                  isActive={hasActiveChild}
                  onClick={() => {
                     if (isIconMode) setSidebarOpen(true);
                  }}
               >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium tracking-wide">
                     {item.title}
                  </span>
                  <ChevronRight
                     className={cn(
                        "ml-auto h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                        open && "rotate-90",
                     )}
                  />
               </SidebarMenuButton>
            </Collapsible.Trigger>
            <Collapsible.Content>
               <SidebarMenuSub>
                  {item.children.map((child) => {
                     const isActive = isNavItemActive(pathname, child.href);
                     return (
                        <SidebarMenuSubItem key={child.href}>
                           <SidebarMenuSubButton
                              asChild
                              isActive={isActive}
                              className={cn(
                                 "transition-[transform,background-color,box-shadow]",
                                 isActive && ACTIVE_LEAF_CLASS,
                              )}
                           >
                              <Link href={child.href}>
                                 <child.icon className="h-4 w-4" />
                                 <span
                                    className={cn(isActive && "font-semibold")}
                                 >
                                    {child.title}
                                 </span>
                              </Link>
                           </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                     );
                  })}
               </SidebarMenuSub>
            </Collapsible.Content>
         </SidebarMenuItem>
      </Collapsible.Root>
   );
}

export function AppSidebar({
   role = ROLES.USER,
   className,
   ...props
}: React.ComponentProps<typeof Sidebar> & { role?: Role }) {
   const pathname = usePathname();
   const isAdmin = isAdminRole(role);
   const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

   return (
      <Sidebar
         variant="floating"
         collapsible="icon"
         className={cn("data-[side=left]:left-3 inset-y-3 h-auto", className)}
         {...props}
      >
         <SidebarHeader className="flex h-16 flex-row items-center gap-2 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:border-b group-data-[collapsible=icon]:border-b-gray-700">
            <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:hidden">
               <Image
                  src="/logo.png"
                  alt="Logo"
                  width={200}
                  height={66}
                  className="h-10 w-auto"
                  priority
               />
            </div>
            <div className="group/logo relative hidden size-8 items-center justify-center group-data-[collapsible=icon]:flex">
               <Image
                  src="/small.png"
                  alt="Logo"
                  width={197}
                  height={287}
                  className="h-7 w-auto transition-opacity duration-200 group-hover/logo:opacity-0"
                  priority
               />
               <SidebarTrigger className="absolute inset-0 size-8 opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100" />
            </div>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:hidden" />
         </SidebarHeader>
         <SidebarContent>
            <SidebarGroup>
               <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                     {navItems.map((item) =>
                        isGroup(item) ? (
                           <NavGroupItem
                              key={item.title}
                              item={item}
                              pathname={pathname}
                           />
                        ) : (
                           <NavLinkItem
                              key={item.title}
                              item={item}
                              pathname={pathname}
                           />
                        ),
                     )}
                  </SidebarMenu>
               </SidebarGroupContent>
            </SidebarGroup>
         </SidebarContent>
         {isAdmin && (
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
         )}
      </Sidebar>
   );
}
