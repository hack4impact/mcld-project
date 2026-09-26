import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";

import { listUpcomingLessons } from "./queries";
import { ScheduledLessonsTable } from "./scheduled-lessons-table";
import { PageHeader, PageShell } from "@/components/page-shell";

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

   const isAdmin = role === ROLES.ADMIN;
   const lessons = await listUpcomingLessons(
      isAdmin ? {} : { coordinatorId: user.id },
   );

   return (
      <PageShell>
         <PageHeader
            title="Scheduled lessons"
            description={
               isAdmin
                  ? "Upcoming private lessons across all coordinators."
                  : "Upcoming private lessons you coordinate."
            }
         />
         <ScheduledLessonsTable lessons={lessons} showCoordinator={isAdmin} />
      </PageShell>
   );
}
