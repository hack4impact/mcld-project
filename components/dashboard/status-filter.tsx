"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
   parseStatusFilter,
   type ServiceStatusFilter,
} from "@/lib/services/service-types";

const filters: { label: string; value: ServiceStatusFilter }[] = [
   { label: "All", value: "all" },
   { label: "Active", value: "active" },
   { label: "Disabled", value: "disabled" },
   { label: "Archived", value: "archived" },
];

export function StatusFilter() {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const current = parseStatusFilter(searchParams.get("status"));

   return (
      <div className="flex flex-wrap gap-2">
         {filters.map((filter) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("status", filter.value);
            params.delete("page");
            const href = `${pathname}?${params.toString()}`;
            const isActive = current === filter.value;

            return (
               <Link
                  key={filter.value}
                  href={href}
                  className={cn(
                     "rounded border px-4 py-1.5 text-sm font-medium transition-colors",
                     isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted",
                  )}
               >
                  {filter.label}
               </Link>
            );
         })}
      </div>
   );
}
