import { Suspense } from "react";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UsersClient } from "./_components/users-client";
import type { UserRow } from "./_components/users-columns";

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
      // A user is "active" when they have an active Stripe subscription
      isActive: row.subscriptionStatus === "active",
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
   const users = await fetchUsers();
   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <h1 className="text-3xl font-bold">Users</h1>
         <UsersClient users={users} />
      </main>
   );
}

function UsersPageSkeleton() {
   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
         <div className="flex items-center justify-between gap-4">
            <div className="h-9 w-64 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-40 rounded-md bg-muted animate-pulse" />
         </div>
         <div className="h-64 rounded-lg border bg-muted animate-pulse" />
      </main>
   );
}
