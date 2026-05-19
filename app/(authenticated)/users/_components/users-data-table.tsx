"use client";

import {
   useCallback,
   useEffect,
   useLayoutEffect,
   useRef,
   useState,
} from "react";
import type { PaginationState, Updater } from "@tanstack/react-table";
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

const FALLBACK_PAGE_SIZE = 12;
const MIN_PAGE_SIZE = 1;

type UsersColumnMeta = {
   colWidth?: string;
   thClassName?: string;
   tdClassName?: string;
};

function pageWindowIndices(pageIndex: number, pageCount: number): number[] {
   const candidates = [pageIndex - 1, pageIndex, pageIndex + 1].filter(
      (i) => i >= 0 && i < pageCount,
   );
   return [...new Set(candidates)].sort((a, b) => a - b);
}

function readBodyRowHeight(scrollEl: HTMLElement): number {
   const row = scrollEl.querySelector("tbody tr");
   if (!row) return 52;
   const h = row.getBoundingClientRect().height;
   return h > 8 ? h : 52;
}

function readTheadHeight(scrollEl: HTMLElement): number {
   const thead = scrollEl.querySelector("thead");
   if (!thead) return 41;
   const h = thead.getBoundingClientRect().height;
   return h > 4 ? h : 41;
}

function computePageSize(scrollEl: HTMLElement): number {
   const ch = scrollEl.clientHeight;
   if (ch < 24) return MIN_PAGE_SIZE;
   const theadH = readTheadHeight(scrollEl);
   const rowH = readBodyRowHeight(scrollEl);
   const usable = ch - theadH - 2;
   return Math.max(MIN_PAGE_SIZE, Math.floor(usable / rowH));
}

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
   const scrollRef = useRef<HTMLDivElement>(null);
   const [pagination, setPagination] = useState<PaginationState>({
      pageIndex: 0,
      pageSize: FALLBACK_PAGE_SIZE,
   });

   const onPaginationChange = useCallback((updater: Updater<PaginationState>) => {
      setPagination((prev) =>
         typeof updater === "function" ? updater(prev) : updater,
      );
   }, []);

   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      autoResetPageIndex: true,
      state: { pagination },
      onPaginationChange,
   });

   const applyMeasuredPageSize = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const nextSize = computePageSize(el);
      setPagination((prev) => {
         if (nextSize === prev.pageSize) return prev;
         const total = data.length;
         const pageCount = Math.max(1, Math.ceil(total / nextSize));
         const nextIndex = Math.min(prev.pageIndex, pageCount - 1);
         return { pageIndex: Math.max(0, nextIndex), pageSize: nextSize };
      });
   }, [data.length]);

   useLayoutEffect(() => {
      requestAnimationFrame(() => applyMeasuredPageSize());
   }, [data, applyMeasuredPageSize]);

   useEffect(() => {
      const el = scrollRef.current;
      if (!el || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(() => {
         requestAnimationFrame(() => applyMeasuredPageSize());
      });
      ro.observe(el);
      return () => ro.disconnect();
   }, [applyMeasuredPageSize]);

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

   const pageButtons = pageWindowIndices(pageIndex, pageCount);

   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
         <div ref={scrollRef} className="min-h-0 w-full min-w-0 flex-1">
            <div className="overflow-hidden rounded-lg border border-border">
               <div className="w-full min-w-0 overflow-auto">
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
                  <TableHeader className="sticky top-0 z-10 bg-primary/30">
                     {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                           {hg.headers.map((h) => {
                              const meta = h.column.columnDef
                                 .meta as UsersColumnMeta | undefined;
                              return (
                                 <TableHead
                                    key={h.id}
                                    className={cn(meta?.thClassName)}
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
         </div>
         <div className="flex shrink-0 min-w-0 flex-col gap-3 border-t border-border bg-background py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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
               {pageButtons.map((i) => (
                  <Button
                     key={i}
                     variant={pageIndex === i ? "outline" : "ghost"}
                     size="sm"
                     className="w-8 hover:bg-primary/20 hover:text-primary"
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
