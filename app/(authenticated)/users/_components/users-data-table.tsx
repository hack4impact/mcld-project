"use client";

import type { CSSProperties } from "react";
import {
   ColumnDef,
   flexRender,
   getCoreRowModel,
   getPaginationRowModel,
   useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { USERS_TABLE_HEADER_BG } from "../_lib/users-table-header";
import { USERS_TABLE_PAGE_SIZE, usersTableScrollMaxHeight } from "../_lib/users-table-scroll";

type UsersColumnMeta = {
   colWidth?: string;
   thClassName?: string;
   tdClassName?: string;
};

interface UsersDataTableProps<TData, TValue> {
   columns: ColumnDef<TData, TValue>[];
   data: TData[];
   emptyMessage?: string;
   rowLabel?: (count: number) => string;
}

export function UsersDataTable<TData, TValue>({
   columns,
   data,
   emptyMessage = "No results.",
   rowLabel = (n) => `${n} row${n === 1 ? "" : "s"}`,
}: UsersDataTableProps<TData, TValue>) {
   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      autoResetPageIndex: true,
      initialState: {
         pagination: {
            pageSize: USERS_TABLE_PAGE_SIZE,
         },
      },
   });

   const headerGroup = table.getHeaderGroups()[0];
   const { pageIndex } = table.getState().pagination;
   const pageSize = table.getState().pagination.pageSize;
   const pageRows = table.getRowModel().rows.length;
   const total = data.length;
   const pageCount = table.getPageCount();
   const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
   const rangeEnd = pageIndex * pageSize + pageRows;

   const noun = rowLabel(total).replace(/^\d+\s*/, "");
   const rangeLabel =
      total === 0
         ? `No ${noun}`
         : `Showing ${rangeStart}–${rangeEnd} of ${total} ${noun}`;

   const scrollStyle: CSSProperties = {
      maxHeight: usersTableScrollMaxHeight(),
   };

   const pageWindowIndices = (() => {
      const idx = pageIndex;
      const candidates = [idx - 1, idx, idx + 1].filter(
         (i) => i >= 0 && i < pageCount,
      );
      return [...new Set(candidates)].sort((a, b) => a - b);
   })();

   return (
      <div className="flex w-full min-w-0 min-h-0 max-h-full flex-1 flex-col">
         <div className="flex w-full max-w-full min-w-0 flex-col self-start overflow-hidden rounded-lg border border-border">
            <div
               className="w-full min-w-0 overflow-auto"
               style={scrollStyle}
            >
               <Table className="table-fixed">
                  {headerGroup ? (
                     <colgroup>
                        {headerGroup.headers.map((h) => {
                           const meta = h.column.columnDef
                              .meta as UsersColumnMeta | undefined;
                           return (
                              <col
                                 key={h.id}
                                 style={
                                    meta?.colWidth
                                       ? { width: meta.colWidth }
                                       : undefined
                                 }
                              />
                           );
                        })}
                     </colgroup>
                  ) : null}
                  <TableHeader
                     className={cn(
                        "sticky top-0 z-10 border-b border-border shadow-sm [&_th]:text-foreground",
                     )}
                     style={{
                        backgroundColor: USERS_TABLE_HEADER_BG,
                     }}
                  >
                     {table.getHeaderGroups().map((hg) => (
                        <TableRow
                           key={hg.id}
                           className="border-b border-border hover:bg-[#E4EEF9]"
                           style={{ backgroundColor: USERS_TABLE_HEADER_BG }}
                        >
                           {hg.headers.map((h) => {
                              const meta = h.column.columnDef
                                 .meta as UsersColumnMeta | undefined;
                              return (
                                 <TableHead
                                    key={h.id}
                                    className={cn(
                                       "min-w-0 overflow-hidden text-ellipsis text-foreground",
                                       meta?.thClassName,
                                    )}
                                    style={{
                                       backgroundColor: USERS_TABLE_HEADER_BG,
                                    }}
                                 >
                                    {h.isPlaceholder
                                       ? null
                                       : flexRender(
                                            h.column.columnDef.header,
                                            h.getContext(),
                                         )}
                                 </TableHead>
                              );
                           })}
                        </TableRow>
                     ))}
                  </TableHeader>
                  <TableBody>
                     {pageRows ? (
                        table.getRowModel().rows.map((r) => (
                           <TableRow key={r.id}>
                              {r.getVisibleCells().map((c) => {
                                 const meta = c.column.columnDef
                                    .meta as UsersColumnMeta | undefined;
                                 return (
                                    <TableCell
                                       key={c.id}
                                       className={cn(
                                          "min-w-0 overflow-hidden text-ellipsis",
                                          meta?.tdClassName,
                                       )}
                                    >
                                       {flexRender(
                                          c.column.columnDef.cell,
                                          c.getContext(),
                                       )}
                                    </TableCell>
                                 );
                              })}
                           </TableRow>
                        ))
                     ) : (
                        <TableRow>
                           <TableCell
                              colSpan={columns.length}
                              className="h-24 whitespace-normal border-r-0! text-center text-muted-foreground"
                           >
                              {emptyMessage}
                           </TableCell>
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
            </div>
         </div>
         <div className="mt-auto flex shrink-0 min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="text-sm text-muted-foreground">{rangeLabel}</div>
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:justify-end">
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
               >
                  Previous
               </Button>
               {pageWindowIndices.map((i) => (
                  <Button
                     key={i}
                     variant={
                        table.getState().pagination.pageIndex === i
                           ? "outline"
                           : "ghost"
                     }
                     size="sm"
                     className="w-8"
                     onClick={() => table.setPageIndex(i)}
                  >
                     {i + 1}
                  </Button>
               ))}
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
               >
                  Next
               </Button>
            </div>
         </div>
      </div>
   );
}
