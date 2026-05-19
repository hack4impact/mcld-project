import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { requireAdmin } from "@/lib/auth/require-admin";
import { UsersClient } from "./_components/users-client";
import { profileRoleLabel } from "./profile-role-label";
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

async function UsersContent() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

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
            <UsersClient users={users} roleFilterOptions={roleFilterOptions} />
         </div>
      </main>
   );
}
