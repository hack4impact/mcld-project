import {
   LayoutGrid,
   BookOpen,
   Users,
   CreditCard,
   MonitorSmartphone,
   Form,
   CalendarClock,
   CalendarRange,
   ClipboardList,
   Baby,
   type LucideIcon,
} from "lucide-react";
import { ROLES, type Role } from "@/lib/roles";

export type NavItem = {
   title: string;
   href: string;
   icon: LucideIcon;
};

const OVERVIEW: NavItem = { title: "Overview", href: "/", icon: LayoutGrid };

export const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
   [ROLES.ADMIN]: [
      OVERVIEW,
      { title: "Services", href: "/services", icon: BookOpen },
      { title: "Users", href: "/users", icon: Users },
      { title: "Finance", href: "/finance", icon: CreditCard },
      { title: "Memberships", href: "/memberships", icon: MonitorSmartphone },
      { title: "Forms", href: "/forms", icon: Form },
   ],
   [ROLES.COORDINATOR]: [
      OVERVIEW,
      {
         title: "Scheduled lessons",
         href: "/scheduled-lessons",
         icon: CalendarClock,
      },
      { title: "Availability", href: "/availability", icon: CalendarRange },
      { title: "Services", href: "/services", icon: BookOpen },
      { title: "Users", href: "/users", icon: Users },
   ],
   [ROLES.USER]: [
      OVERVIEW,
      {
         title: "My registrations",
         href: "/registrations",
         icon: ClipboardList,
      },
      { title: "My children", href: "/children", icon: Baby },
   ],
};

/**
 * Main menu for a role. Missing or unknown roles only get Overview — never
 * another role's menu. Pages still enforce their own authorization.
 */
export function getNavItems(role: unknown): NavItem[] {
   if (typeof role === "string" && Object.hasOwn(NAV_ITEMS_BY_ROLE, role)) {
      return NAV_ITEMS_BY_ROLE[role as Role];
   }
   return [OVERVIEW];
}

/** `/` only matches exactly; other links also match their nested routes. */
export function isNavItemActive(pathname: string, href: string): boolean {
   return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
}
