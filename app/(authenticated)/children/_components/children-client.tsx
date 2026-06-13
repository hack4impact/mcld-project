"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpZA, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsersDataTable } from "@/app/(authenticated)/users/_components/users-data-table";

import type { ChildView } from "../queries";
import { getChildrenColumns } from "./children-columns";
import { ChildDetailDialog } from "./child-detail-dialog";
import { CreateChildDialog } from "./create-child-dialog";

type SortDir = "asc" | "desc";

export function ChildrenClient({ childList }: { childList: ChildView[] }) {
   const [nameQuery, setNameQuery] = useState("");
   const [sortDir, setSortDir] = useState<SortDir>("asc");
   const [editChild, setEditChild] = useState<ChildView | null>(null);
   const [editOpen, setEditOpen] = useState(false);

   const columns = useMemo(
      () =>
         getChildrenColumns((child) => {
            setEditChild(child);
            setEditOpen(true);
         }),
      [],
   );

   const filtered = useMemo(() => {
      const query = nameQuery.trim().toLowerCase();

      return childList
         .filter((c) => {
            if (!query) return true;
            const name = `${c.firstName} ${c.lastName}`.toLowerCase();
            return name.includes(query);
         })
         .sort((a, b) => {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return sortDir === "asc"
               ? nameA.localeCompare(nameB)
               : nameB.localeCompare(nameA);
         });
   }, [childList, nameQuery, sortDir]);

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
         {editChild && (
            <ChildDetailDialog
               child={editChild}
               open={editOpen}
               onOpenChange={(open) => {
                  setEditOpen(open);
                  if (!open) setEditChild(null);
               }}
            />
         )}

         <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 pb-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
               <div className="relative w-56 min-w-0 shrink p-0.5 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                     id="children-search"
                     placeholder="Search by name..."
                     value={nameQuery}
                     onChange={(e) => setNameQuery(e.target.value)}
                     className="w-full min-w-0 pl-9"
                  />
               </div>

               <Button
                  id="children-sort-toggle"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
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

            <div className="shrink-0">
               <CreateChildDialog />
            </div>
         </div>

         <UsersDataTable
            columns={columns}
            data={filtered}
            emptyMessage="No children yet. Add one to get started."
            rowLabel={(n) => `${n} child${n === 1 ? "" : "ren"}`}
         />
      </div>
   );
}