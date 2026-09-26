"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
   profileRoleLabel,
   type ReadOnlyUserRow,
   type UserRow,
} from "../profile-role-label";
import { UserActionsCell } from "./user-actions-cell";

const ROLE_STYLES: Record<string, { className: string }> = {
   admin: {
      className: "bg-red-600 text-white",
   },
   coordinator: {
      className: "bg-yellow-600 text-white",
   },
   user: {
      className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
   },
};

function RoleBadge({ role }: { role: string }) {
   const style = ROLE_STYLES[role] ?? ROLE_STYLES.user;
   return (
      <span
         className={cn(
            "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
            style.className,
         )}
      >
         <span className="truncate">{profileRoleLabel(role)}</span>
      </span>
   );
}

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
                     <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
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
         cell: ({ row }) => <RoleBadge role={row.original.role} />,
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
