import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { getUserRole } from "@/lib/auth/require-admin";
import { canViewUsers, ROLES, type Role } from "@/lib/roles";
import { UsersClient } from "./_components/users-client";
import { profileRoleLabel } from "./profile-role-label";
import {
   listDistinctProfileRoles,
   listReadOnlyUsers,
   listUsersWithEmails,
} from "./queries";

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

async function UsersContent() {
   let role: Role | null = null;
   try {
      role = await getUserRole();
   } catch (error) {
      console.error("[UsersPage] failed to read role claim", error);
   }

   if (!canViewUsers(role)) {
      redirect("/");
   }

   const [userData, distinctRoles] = await Promise.all([
      role === ROLES.ADMIN
         ? listUsersWithEmails().then((users) => ({
              canManage: true as const,
              users,
           }))
         : listReadOnlyUsers().then((users) => ({
              canManage: false as const,
              users,
           })),
      listDistinctProfileRoles(),
   ]);

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
            <UsersClient {...userData} roleFilterOptions={roleFilterOptions} />
         </div>
      </main>
   );
}
