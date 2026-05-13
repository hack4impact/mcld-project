"use client";

import * as React from "react";
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
import { DataTable } from "@/components/data-table";
import { usersColumns, type UserRow } from "./users-columns";

type StatusTab = "all" | "active" | "inactive";
type RoleFilter = "all" | "user" | "admin" | "coach";
type SortDir = "asc" | "desc";

interface UsersClientProps {
   users: UserRow[];
}

const STATUS_TABS: { value: StatusTab; label: string }[] = [
   { value: "all", label: "All Users" },
   { value: "active", label: "Active" },
   { value: "inactive", label: "Inactive" },
];

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
   { value: "all", label: "All Roles" },
   { value: "user", label: "User" },
   { value: "admin", label: "Admin" },
   { value: "coach", label: "Coach" },
];

export function UsersClient({ users }: UsersClientProps) {
   const [tab, setTab] = React.useState<StatusTab>("all");
   const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
   const [nameQuery, setNameQuery] = React.useState("");
   const [sortDir, setSortDir] = React.useState<SortDir>("asc");

   const filtered = React.useMemo(() => {
      const query = nameQuery.trim().toLowerCase();

      return users
         .filter((u) => {
            if (!query) return true;
            return `${u.firstName} ${u.lastName}`.toLowerCase().includes(query);
         })
         .filter((u) => {
            if (tab === "all") return true;
            return tab === "active" ? u.isActive : !u.isActive;
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
      <Tabs
         value={tab}
         onValueChange={(v) => setTab(v as StatusTab)}
         className="w-full"
      >
         {/* Single toolbar row: search → status tabs → role select → sort icon */}
         <div className="flex items-center gap-3">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
               <Input
                  id="users-search"
                  placeholder="Search by name..."
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  className="pl-9 w-56"
               />
            </div>

            <TabsList className="border border-border">
               {STATUS_TABS.map(({ value, label }) => (
                  <TabsTrigger key={value} value={value}>
                     {label}
                  </TabsTrigger>
               ))}
            </TabsList>

            <Select
               value={roleFilter}
               onValueChange={(v) => setRoleFilter(v as RoleFilter)}
            >
               <SelectTrigger id="users-role-filter" className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
               </SelectTrigger>
               <SelectContent>
                  {ROLE_OPTIONS.map(({ value, label }) => (
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
               onClick={() =>
                  setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
               }
               aria-label={sortDir === "asc" ? "Sort Z to A" : "Sort A to Z"}
            >
               {sortDir === "asc" ? (
                  <ArrowDownAZ className="h-4 w-4" />
               ) : (
                  <ArrowUpZA className="h-4 w-4" />
               )}
            </Button>
         </div>

         <TabsContent value={tab}>
            <DataTable
               columns={usersColumns}
               data={filtered}
               emptyMessage="No users match the current filters."
               rowLabel={(n) => `${n} user${n === 1 ? "" : "s"}`}
            />
         </TabsContent>
      </Tabs>
   );
}
