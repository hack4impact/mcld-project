"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, ArrowUpZA, Search } from "lucide-react";
import { UsersDataTable } from "./users-data-table";
import { usersColumns } from "./users-columns";
import type { UserRow } from "../profile-role-label";

const USER_SUBSCRIPTION_VIEW_TABS = [
   { value: "all", label: "All Users" },
   { value: "active", label: "Active" },
   { value: "inactive", label: "Inactive" },
] as const;

export type UserSubscriptionViewTab =
   (typeof USER_SUBSCRIPTION_VIEW_TABS)[number]["value"];

type SortDir = "asc" | "desc";

export interface RoleFilterOption {
   value: string;
   label: string;
}

interface UsersClientProps {
   users: UserRow[];
   roleFilterOptions: RoleFilterOption[];
}

export function UsersClient({ users, roleFilterOptions }: UsersClientProps) {
   const [tab, setTab] = useState<UserSubscriptionViewTab>("all");
   const [roleFilter, setRoleFilter] = useState<string>("all");
   const [nameQuery, setNameQuery] = useState<string>("");
   const [sortDir, setSortDir] = useState<SortDir>("asc");

   const filtered = useMemo(() => {
      const query = nameQuery.trim().toLowerCase();

      return users
         .filter((u) => {
            if (!query) return true;
            const name = `${u.firstName} ${u.lastName}`.toLowerCase();
            return (
               name.includes(query) || u.email.toLowerCase().includes(query)
            );
         })
         .filter((u) => {
            if (tab === "all") return true;
            if (tab === "active") return u.isActive;
            return !u.isActive;
         })
         .filter((u) => {
            if (roleFilter === "all") return true;
            return u.role === roleFilter;
         })
         .sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return sortDir === "asc"
               ? nameA.localeCompare(nameB)
               : nameB.localeCompare(nameA);
         });
   }, [users, nameQuery, tab, roleFilter, sortDir]);

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
         <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as UserSubscriptionViewTab)}
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden"
         >
         <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
               <div className="relative p-0.5 min-w-[min(100%,10rem)] max-w-full grow sm:max-w-xs sm:grow-0 sm:basis-56">
                  <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                     id="users-search"
                     placeholder="Search by name or email..."
                     value={nameQuery}
                     onChange={(e) => setNameQuery(e.target.value)}
                     className="w-full min-w-0 pl-9"
                  />
               </div>

               <TabsList className="h-auto min-h-8 max-w-full min-w-0 flex-wrap justify-start border border-border">
                  {USER_SUBSCRIPTION_VIEW_TABS.map(({ value, label }) => (
                     <TabsTrigger key={value} value={value}>
                        {label}
                     </TabsTrigger>
                  ))}
               </TabsList>
            </div>

            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
               <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger
                     id="users-role-filter"
                     className="w-[min(100%,11rem)] min-w-[8.5rem] sm:w-[140px]"
                  >
                     <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                     {roleFilterOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                           {label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>

               <Button
                  id="users-sort-toggle"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                     setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                  aria-label={
                     sortDir === "asc" ? "Sort Z to A" : "Sort A to Z"
                  }
               >
                  {sortDir === "asc" ? (
                     <ArrowDownAZ className="h-4 w-4" />
                  ) : (
                     <ArrowUpZA className="h-4 w-4" />
                  )}
               </Button>
            </div>
         </div>

         <TabsContent
            value={tab} 
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
         >
            <UsersDataTable
               columns={usersColumns}
               data={filtered}
               emptyMessage="No users match the current filters."
               rowLabel={(n) => `${n} user${n === 1 ? "" : "s"}`}
            />
         </TabsContent>
      </Tabs>
      </div>
   );
}
