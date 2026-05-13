import { Suspense } from "react";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UsersClient } from "./_components/users-client";
import type { UserRow } from "./_components/users-columns";
import { USERS_SUBSCRIPTION_STATUS_ACTIVE } from "./_lib/subscription-constants";
import { listDistinctProfileRoles } from "./queries";
import { profileRoleLabel } from "./_lib/role-labels";

async function fetchUsers(): Promise<UserRow[]> {
   const rows = await db
      .select({
         id: profiles.id,
         firstName: profiles.firstName,
         lastName: profiles.lastName,
         role: profiles.role,
         createdAt: profiles.createdAt,
         subscriptionStatus: subscriptions.status,
      })
      .from(profiles)
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id));

   return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      createdAt: row.createdAt,
      isActive: row.subscriptionStatus === USERS_SUBSCRIPTION_STATUS_ACTIVE,
   }));
}

export default function UsersPage() {
   return (
      <Suspense fallback={<UsersPageSkeleton />}>
         <UsersContent />
      </Suspense>
   );
}

async function UsersContent() {
   const [users, distinctRoles] = await Promise.all([
      fetchUsers(),
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
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-6 overflow-hidden p-8">
         <h1 className="sticky top-0 z-20 shrink-0 bg-background pb-2 text-3xl font-bold">
            Users
         </h1>
         <UsersClient users={users} roleFilterOptions={roleFilterOptions} />
      </main>
   );
}

function UsersPageSkeleton() {
   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-6 overflow-hidden p-8">
         <div className="h-9 w-24 shrink-0 rounded-md bg-muted animate-pulse" />
         <div className="flex items-center justify-between gap-4">
            <div className="h-9 w-64 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-40 rounded-md bg-muted animate-pulse" />
         </div>
         <div className="h-64 rounded-lg border bg-muted animate-pulse" />
      </main>
   );
}
