"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
   { href: "/dashboard/services", label: "Services" },
   { href: "/dashboard/example-other", label: "Example other tab" },
];

export function DashboardNav() {
   const pathname = usePathname();

   return (
      <nav className="flex flex-wrap gap-1" aria-label="Dashboard sections">
         {tabs.map((tab) => {
            const active =
               pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
               <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                     "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                     active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
               >
                  {tab.label}
               </Link>
            );
         })}
      </nav>
   );
}
