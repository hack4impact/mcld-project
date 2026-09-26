import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UsersDataTable } from "@/app/(authenticated)/users/_components/users-data-table";
import { formatDateFromInstant } from "@/lib/format";
import type { AdultRegistration } from "../queries";
import { STATUS_VARIANT } from "./constants";

const columns: ColumnDef<AdultRegistration>[] = [
   {
      id: "profile",
      header: "User",
      meta: { colWidth: "40%", tdClassName: "whitespace-normal align-middle" },
      cell: ({ row }) => {
         const p = row.original.profile;
         const initials = `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
         return (
            <div className="flex min-w-0 items-center gap-3">
               <Avatar>
                  <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                     {initials}
                  </AvatarFallback>
               </Avatar>
               <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-sm">
                     {p.firstName} {p.lastName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{p.email}</span>
               </div>
            </div>
         );
      },
   },
   {
      id: "status",
      header: "Status",
      meta: { colWidth: "20%" },
      cell: ({ row }) => (
         <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"} className="capitalize">
            {row.original.status.replace(/_/g, " ")}
         </Badge>
      ),
   },
   {
      id: "registeredAt",
      header: "Registered",
      meta: { colWidth: "20%" },
      cell: ({ row }) => (
         <span className="text-sm text-muted-foreground">
            {formatDateFromInstant(row.original.registeredAt)}
         </span>
      ),
   },
];

export function AdultTable({ registrations }: { registrations: AdultRegistration[] }) {
   return (
      <UsersDataTable
         columns={columns}
         data={registrations}
         emptyMessage="No registrations yet."
         rowLabel={(n) => `${n} registration${n === 1 ? "" : "s"}`}
      />
   );
}
