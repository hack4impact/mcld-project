"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback} from "@/components/ui/avatar";
import { profileRoleLabel, type UserRow } from "../profile-role-label";
import { UserActionsCell } from "./user-actions-cell";

export function getUsersColumns(
   onEdit: (user: UserRow) => void,
): ColumnDef<UserRow>[] {
   return [
   {
      id: "profile",
      header: "User Profile",
      meta: {
         colWidth: "32%",
         tdClassName: "whitespace-normal align-middle",
      },
      cell: ({ row }) => {
         const u = row.original;
         const fullName = `${u.firstName} ${u.lastName}`;
         return (
            <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
               <Avatar>
                  <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                     {`${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase()}
                  </AvatarFallback>
               </Avatar>
               <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-sm">
                     {fullName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                     {u.email}
                  </span>
               </div>
            </div>
         );
      },
   },
   {
      accessorKey: "role",
      header: "Role",
      meta: { colWidth: "14%" },
      cell: ({ row }) => (
         <span className="inline-flex max-w-full min-w-0 items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize text-foreground">
            <span className="truncate">
               {profileRoleLabel(row.original.role)}
            </span>
         </span>
      ),
   },
   {
      id: "status",
      header: "Status",
      meta: { colWidth: "14%" },
      cell: ({ row }) => {
         const active = row.original.isActive;
         return (
            <Badge variant={active ? "default" : "secondary"} className="gap-1.5">
               <span
                  className={`h-2 w-2 rounded-full ${
                     active ? "bg-green-500" : "bg-muted-foreground/50"
                  }`}
               />
               {active ? "Active" : "Inactive"}
            </Badge>
         );
      },
   },
   {
      id: "lastLoginAt",
      header: "Last Login",
      meta: { colWidth: "18%" },
      cell: ({ row }) => (
         <span className="block min-w-0 truncate text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-CA", {
               year: "numeric",
               month: "short",
               day: "numeric",
            }).format(new Date(row.original.lastLoginAt || "Never Logged in" ))} 
         </span>
      ),
   },
   {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      meta: {
         colWidth: "22%",
         thClassName: "text-right",
         tdClassName: "text-right",
      },
      cell: ({ row }) => <UserActionsCell user={row.original} onEdit={onEdit} />,
   },
   ];
}