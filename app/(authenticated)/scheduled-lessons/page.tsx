import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";

import { listUpcomingLessonsForCoordinator } from "./queries";
import { ScheduledLessonsTable } from "./scheduled-lessons-table";

export default async function ScheduledLessonsPage() {
   const role = await getUserRole();
   if (role !== ROLES.ADMIN && role !== ROLES.COORDINATOR) {
      redirect("/");
   }

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) redirect("/login");

   const lessons = await listUpcomingLessonsForCoordinator(user.id);

   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <h1 className="text-3xl font-bold">Scheduled lessons</h1>
         <p className="text-sm text-muted-foreground">
            Upcoming private lessons you coordinate.
         </p>
         <ScheduledLessonsTable lessons={lessons} />
      </main>
   );
}
