"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
   { label: "Programs", href: "/dashboard/services/programs" },
   { label: "Private Lessons", href: "/dashboard/services/private-lessons" },
];

export function ServicesTabs() {
   const pathname = usePathname();

   return (
      <div className="flex gap-8 px-6">
         {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
               <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                     "border-b-2 pb-3 text-sm font-bold tracking-wide uppercase transition-colors",
                     isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
               >
                  {tab.label}
               </Link>
            );
         })}
      </div>
   );
}
