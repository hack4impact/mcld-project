"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import { profileRoleLabel } from "../_lib/role-labels";

export type UserRow = {
   id: string;
   firstName: string;
   lastName: string;
   role: string;
   isActive: boolean;
   createdAt: Date;
};

function AvatarCircle({ name }: { name: string }) {
   const [first = "", last = ""] = name.trim().split(" ");
   const initials = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
   return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
         {initials}
      </span>
   );
}

export const usersColumns: ColumnDef<UserRow>[] = [
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
         const email = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}@mcld.ca`;
         return (
            <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
               <AvatarCircle name={fullName} />
               <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-sm">
                     {fullName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                     {email}
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
            <span className="inline-flex items-center gap-1.5 text-sm">
               <span
                  className={`h-2 w-2 rounded-full ${
                     active ? "bg-green-500" : "bg-muted-foreground/50"
                  }`}
               />
               <span
                  className={
                     active ? "text-foreground" : "text-muted-foreground"
                  }
               >
                  {active ? "Active" : "Inactive"}
               </span>
            </span>
         );
      },
   },
   {
      id: "createdAt",
      header: "Last Login",
      meta: { colWidth: "18%" },
      cell: ({ row }) => (
         <span className="block min-w-0 truncate text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-CA", {
               year: "numeric",
               month: "short",
               day: "numeric",
            }).format(new Date(row.original.createdAt))}
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
      cell: () => (
         <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     aria-label="Edit user"
                     disabled
                  >
                     <Pencil />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>Edit (coming soon)</TooltipContent>
            </Tooltip>
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     aria-label="Give discount"
                     disabled
                  >
                     <Tag />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>Give coupon (coming soon)</TooltipContent>
            </Tooltip>
         </div>
      ),
   },
];
