import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { CoordinatorAvailabilityEditor } from "@/components/availability/coordinator-availability-editor";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import {
   fetchCoordinatorAvailabilityEditorState,
   listCoordinatorAvailability,
   listCoordinatorAvailabilityOverrides,
} from "@/app/private-lessons/actions";
import { previewRange, todayInTimeZone } from "@/lib/availability-editor";
import { listPrivateLessonDurations } from "./queries";

export default function AvailabilityPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <AvailabilityContent />
      </Suspense>
   );
}

async function AvailabilityContent() {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   const role = await getUserRole();
   if (role !== ROLES.COORDINATOR) {
      redirect("/");
   }

   const coordinatorId = user.id;
   const [state, lessonDurations] = await Promise.all([
      fetchCoordinatorAvailabilityEditorState({ coordinatorId }),
      listPrivateLessonDurations(coordinatorId),
   ]);
   if ("error" in state) {
      throw new Error(state.error);
   }

   const today = todayInTimeZone(state.timezone);
   const range = previewRange(today, 0);
   const [preview, overrideList] = await Promise.all([
      listCoordinatorAvailability({
         coordinatorId,
         from: range.from,
         to: range.to,
      }),
      listCoordinatorAvailabilityOverrides({ coordinatorId, from: today }),
   ]);
   if ("error" in preview) throw new Error(preview.error);
   if ("error" in overrideList) throw new Error(overrideList.error);

   return (
      <PageShell>
         <PageHeader
            title="Availability"
            description="Set your weekly hours and date overrides for private lessons."
            actions={
               <Button asChild variant="outline">
                  <Link href="/scheduled-lessons">
                     <CalendarClock />
                     View scheduled lessons
                  </Link>
               </Button>
            }
         />
         <CoordinatorAvailabilityEditor
            coordinatorId={coordinatorId}
            initialHours={state.hours}
            initialTimezone={state.timezone}
            initialOverrides={overrideList.overrides}
            initialOccurrences={preview.occurrences}
            initialToday={today}
            lessonDurations={lessonDurations}
         />
      </PageShell>
   );
}
