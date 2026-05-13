"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";

export type UserRow = {
   id: string;
   firstName: string;
   lastName: string;
   role: "user" | "admin" | "coach";
   isActive: boolean;
   createdAt: Date;
};

// Role pill — matches the "Specialist / Student" style from the Figma design
const ROLE_LABEL: Record<UserRow["role"], string> = {
   admin: "Admin",
   coach: "Coach",
   user: "User",
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
      cell: ({ row }) => {
         const u = row.original;
         const fullName = `${u.firstName} ${u.lastName}`;
         // Placeholder email derived from name — real email would require joining auth.users
         const email = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}@mcld.ca`;
         return (
            <div className="flex items-center gap-3">
               <AvatarCircle name={fullName} />
               <div className="flex flex-col">
                  <span className="font-semibold text-sm">{fullName}</span>
                  <span className="text-xs text-muted-foreground">{email}</span>
               </div>
            </div>
         );
      },
   },
   {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
         <span className="inline-flex rounded-full border border-border px-3 py-0.5 text-xs font-medium capitalize text-foreground">
            {ROLE_LABEL[row.original.role]}
         </span>
      ),
   },
   {
      id: "status",
      header: "Status",
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
      cell: ({ row }) => (
         <span className="text-sm text-muted-foreground">
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
