import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import { UsersClient } from "./_components/users-client";
import { profileRoleLabel, type UserRow } from "./profile-role-label";
import { listDistinctProfileRoles, listUsersWithEmails } from "./queries";

export default function UsersPage() {
   return (
      <Suspense
         fallback={
            <Spinner className="size-8 text-muted-foreground" />
         }
      >
         <UsersContent />
      </Suspense>
   );
}

function toReadOnlyRow(user: UserRow): UserRow {
   const row = { ...user };
   delete row.stripeCustomerId;
   return row;
}

async function UsersContent() {
   const role = await getUserRole();

   if (role !== ROLES.ADMIN && role !== ROLES.COORDINATOR) {
      redirect("/");
   }

   const canManage = role === ROLES.ADMIN;

   const users = await listUsersWithEmails();
   const distinctRoles = await listDistinctProfileRoles();

   const roleFilterOptions: { value: string; label: string }[] = [
      { value: "all", label: "All Roles" },
      ...distinctRoles.map((role) => ({
         value: role,
         label: profileRoleLabel(role),
      })),
   ];

   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
         <h1 className="shrink-0 text-3xl font-bold">Users</h1>
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <UsersClient
               users={canManage ? users : users.map(toReadOnlyRow)}
               roleFilterOptions={roleFilterOptions}
               canManage={canManage}
            />
         </div>
      </main>
   );
}
