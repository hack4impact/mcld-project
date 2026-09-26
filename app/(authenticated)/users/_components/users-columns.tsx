"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
   profileRoleLabel,
   type ReadOnlyUserRow,
   type UserRow,
} from "../profile-role-label";
import { UserActionsCell } from "./user-actions-cell";

const COLUMN_WEIGHTS = {
   profile: 32,
   role: 14,
   lastLoginAt: 18,
   actions: 22,
} as const;

type ColumnId = keyof typeof COLUMN_WEIGHTS;

function columnWidths<K extends ColumnId>(ids: K[]): Record<K, string> {
   const total = ids.reduce((sum, id) => sum + COLUMN_WEIGHTS[id], 0);
   const widths = {} as Record<K, string>;
   for (const id of ids) {
      widths[id] = `${((COLUMN_WEIGHTS[id] / total) * 100).toFixed(2)}%`;
   }
   return widths;
}

function baseColumns<T extends ReadOnlyUserRow>(
   widths: Record<Exclude<ColumnId, "actions">, string>,
): ColumnDef<T>[] {
   return [
      {
         id: "profile",
         header: "User Profile",
         meta: {
            colWidth: widths.profile,
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
         meta: { colWidth: widths.role },
         cell: ({ row }) => (
            <span className="inline-flex max-w-full min-w-0 items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize text-foreground">
               <span className="truncate">
                  {profileRoleLabel(row.original.role)}
               </span>
            </span>
         ),
      },
      {
         id: "lastLoginAt",
         header: "Last Login",
         meta: { colWidth: widths.lastLoginAt },
         cell: ({ row }) => (
            <span className="block min-w-0 truncate text-sm text-muted-foreground">
               {new Intl.DateTimeFormat("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
               }).format(
                  new Date(row.original.lastLoginAt || "Never Logged in"),
               )}
            </span>
         ),
      },
   ];
}

export function getReadOnlyUsersColumns(): ColumnDef<ReadOnlyUserRow>[] {
   return baseColumns(columnWidths(["profile", "role", "lastLoginAt"]));
}

export function getAdminUsersColumns(
   onEdit: (user: UserRow) => void,
): ColumnDef<UserRow>[] {
   const widths = columnWidths(["profile", "role", "lastLoginAt", "actions"]);
   return [
      ...baseColumns<UserRow>(widths),
      {
         id: "actions",
         header: () => <div className="text-right">Actions</div>,
         meta: {
            colWidth: widths.actions,
            thClassName: "text-right",
            tdClassName: "text-right",
         },
         cell: ({ row }) => (
            <UserActionsCell user={row.original} onEdit={onEdit} />
         ),
      },
   ];
}
