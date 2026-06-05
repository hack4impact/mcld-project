"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ServiceStatusFilter } from "@/lib/services/list-services";

const filters: { label: string; value: ServiceStatusFilter }[] = [
   { label: "All", value: "all" },
   { label: "Active", value: "active" },
   { label: "Disabled", value: "disabled" },
   { label: "Archived", value: "archived" },
];

export function StatusFilter() {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const current = (searchParams.get("status") as ServiceStatusFilter) || "all";

   return (
      <div className="flex flex-wrap gap-2">
         {filters.map((filter) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("status", filter.value);
            if (filter.value === "all") {
               params.delete("page");
            } else {
               params.delete("page");
            }
            const href = `${pathname}?${params.toString()}`;
            const isActive = current === filter.value;

            return (
               <Link
                  key={filter.value}
                  href={href}
                  className={cn(
                     "rounded border px-4 py-1.5 text-sm font-medium transition-colors",
                     isActive
                        ? "border-[#1a3d52] bg-[#1a3d52] text-white"
                        : "border-[#c5dce8] bg-white text-[#1a3d52] hover:bg-[#f0f7fa]",
                  )}
               >
                  {filter.label}
               </Link>
            );
         })}
      </div>
   );
}
