"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
   { label: "Overview", href: "/dashboard" },
   { label: "Services", href: "/dashboard/services/programs" },
   { label: "Users", href: "/dashboard/users" },
   { label: "Finances", href: "/dashboard/finances" },
   { label: "Memberships", href: "/dashboard/memberships" },
];

export function DashboardSidebar() {
   const pathname = usePathname();

   return (
      <aside className="flex w-56 shrink-0 flex-col bg-sidebar px-4 py-8 lg:w-64">
         <div className="mb-10 px-2">
            <p className="text-xs font-semibold tracking-wide text-sidebar-foreground">
               Montreal Centre for
            </p>
            <p className="text-xs font-semibold tracking-wide text-sidebar-foreground">
               Learning Disabilities
            </p>
         </div>
         <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
               const isServices =
                  item.label === "Services" &&
                  pathname.startsWith("/dashboard/services");
               const isActive =
                  pathname === item.href ||
                  isServices ||
                  (item.href === "/dashboard" &&
                     pathname === "/dashboard");

               return (
                  <Link
                     key={item.href}
                     href={item.href}
                     className={cn(
                        "rounded px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors",
                        isActive
                           ? "bg-sidebar-accent/70 text-sidebar-accent-foreground"
                           : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40",
                     )}
                  >
                     {item.label}
                  </Link>
               );
            })}
         </nav>
      </aside>
   );
}
