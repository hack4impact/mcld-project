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
      <div className="flex gap-8 border-b border-[#d4e4ed] px-6">
         {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
               <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                     "border-b-2 pb-3 text-sm font-bold tracking-wide uppercase transition-colors",
                     isActive
                        ? "border-[#1a3d52] text-[#1a3d52]"
                        : "border-transparent text-[#6b8fa3] hover:text-[#1a3d52]",
                  )}
               >
                  {tab.label}
               </Link>
            );
         })}
      </div>
   );
}
