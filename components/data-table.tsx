"use client";

import {
   ColumnDef,
   flexRender,
   getCoreRowModel,
   getPaginationRowModel,
   useReactTable,
} from "@tanstack/react-table";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
   columns: ColumnDef<TData, TValue>[];
   data: TData[];
   emptyMessage?: string;
   rowLabel?: (count: number) => string;
}

export function DataTable<TData, TValue>({
   columns,
   data,
   emptyMessage = "No results.",
   rowLabel = (n) => `${n} row${n === 1 ? "" : "s"}`,
}: DataTableProps<TData, TValue>) {
   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
   });

   return (
      <div className="overflow-hidden rounded-2xl border border-primary/40 bg-card">
         <div>
            <Table>
               <TableHeader className="bg-primary [&_th]:text-primary-foreground [&_tr]:border-primary [&_tr]:hover:bg-primary">
                  {table.getHeaderGroups().map((hg) => (
                     <TableRow key={hg.id}>
                        {hg.headers.map((h) => (
                           <TableHead key={h.id}>
                              {h.isPlaceholder
                                 ? null
                                 : flexRender(
                                      h.column.columnDef.header,
                                      h.getContext(),
                                   )}
                           </TableHead>
                        ))}
                     </TableRow>
                  ))}
               </TableHeader>
               <TableBody>
                  {table.getRowModel().rows.length ? (
                     table.getRowModel().rows.map((r) => (
                        <TableRow key={r.id}>
                           {r.getVisibleCells().map((c) => (
                              <TableCell key={c.id}>
                                 {flexRender(
                                    c.column.columnDef.cell,
                                    c.getContext(),
                                 )}
                              </TableCell>
                           ))}
                        </TableRow>
                     ))
                  ) : (
                     <TableRow>
                        <TableCell
                           colSpan={columns.length}
                           className="h-32 border-r-0! text-center text-muted-foreground"
                        >
                           {emptyMessage}
                        </TableCell>
                     </TableRow>
                  )}
               </TableBody>
            </Table>
         </div>
          <div className="flex flex-col gap-3 border-t border-primary/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
             <div className="text-sm text-muted-foreground">
                {(() => {
                   const pageRows = table.getRowModel().rows.length;
                   const total = data.length;
                   // Strip leading number from rowLabel to get the noun ("users", "services", …)
                   const noun = rowLabel(total).replace(/^\d+\s*/, "");
                   return `Showing ${pageRows} of ${total} ${noun}`;
                })()}
             </div>
             <div className="flex items-center gap-1">
                <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => table.previousPage()}
                   disabled={!table.getCanPreviousPage()}
                >
                   <ChevronLeft />
                   Previous
                </Button>
                {Array.from({ length: table.getPageCount() }, (_, i) => i).map(
                   (pageIndex) => (
                      <Button
                         key={pageIndex}
                         variant={
                            table.getState().pagination.pageIndex === pageIndex
                               ? "secondary"
                               : "ghost"
                         }
                         size="icon-sm"
                         onClick={() => table.setPageIndex(pageIndex)}
                      >
                         {pageIndex + 1}
                      </Button>
                   ),
                )}
                <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => table.nextPage()}
                   disabled={!table.getCanNextPage()}
                >
                   Next
                   <ChevronRight />
                </Button>
             </div>
          </div>
       </div>
    );
}
