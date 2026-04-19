"use client";

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
      <div>
         <div className="overflow-hidden rounded-lg border border-border">
            <Table>
               <TableHeader className="bg-primary/30">
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
                           className="h-24 border-r-0! text-center text-muted-foreground"
                        >
                           {emptyMessage}
                        </TableCell>
                     </TableRow>
                  )}
               </TableBody>
            </Table>
         </div>
         <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
               {rowLabel(data.length)}
            </div>
            <div className="flex items-center gap-2">
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
               >
                  Previous
               </Button>
               <Button
                  variant="outline"
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
