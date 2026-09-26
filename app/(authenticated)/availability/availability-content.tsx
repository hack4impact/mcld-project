import { redirect } from "next/navigation";
import { CalendarRange, CircleAlert, SearchX, UsersRound } from "lucide-react";

import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import {
   CoordinatorAvailabilityEditor,
   type CoordinatorAvailabilityEditorProps,
} from "@/components/availability/coordinator-availability-editor";
import { CoordinatorPicker } from "@/components/availability/coordinator-picker";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import {
   fetchCoordinatorAvailabilityEditorState,
   listCoordinatorAvailability,
   listCoordinatorAvailabilityOverrides,
} from "@/app/private-lessons/actions";
import { previewRange, todayInTimeZone } from "@/lib/availability-editor";
import { listCoordinators } from "@/app/(authenticated)/services/queries";
import { listPrivateLessonDurations } from "./queries";

export async function AvailabilityContent({
   searchParams,
}: {
   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();

   if (!user) {
      redirect("/login");
   }

   const role = await getUserRole();
   if (role === ROLES.COORDINATOR) {
      const editor = await loadEditor(user.id);
      if ("error" in editor) {
         throw new Error(editor.error);
      }

      return (
         <PageShell>
            <PageHeader
               title="Availability"
               description="Set when you're available for private lessons. Families pick one of these times at checkout."
            />
            <CoordinatorAvailabilityEditor {...editor} />
         </PageShell>
      );
   }
   if (role !== ROLES.ADMIN) {
      redirect("/");
   }

   const [{ coordinator: requestedId }, coordinators] = await Promise.all([
      searchParams,
      listCoordinators(),
   ]);
   const selected = coordinators.find(({ id }) => id === requestedId);
   const picker = coordinators.length > 0 && (
      <CoordinatorPicker
         coordinators={coordinators}
         selectedId={selected?.id ?? null}
      />
   );

   if (!selected) {
      return (
         <PageShell>
            <PageHeader
               title="Availability"
               description="Set when coordinators are available for private lessons. Families pick one of these times at checkout."
               actions={picker}
            />
            {coordinators.length === 0 ? (
               <EmptyState
                  icon={<UsersRound />}
                  title="No coordinators yet"
                  description="Give someone the Coordinator role on the Users page, then set their availability here."
               />
            ) : requestedId ? (
               <EmptyState
                  icon={<SearchX />}
                  title="Coordinator not found"
                  description="This link doesn't match any coordinator. Pick someone above instead."
               />
            ) : (
               <EmptyState
                  icon={<CalendarRange />}
                  title="Choose a coordinator"
                  description="Pick someone above to see and edit their weekly hours, date overrides and preview."
               />
            )}
         </PageShell>
      );
   }

   const editor = await loadEditor(selected.id);

   return (
      <PageShell>
         <PageHeader
            title={`${selected.firstName} ${selected.lastName}'s availability`}
            description={`Set when ${selected.firstName} is available for private lessons. Families pick one of these times at checkout.`}
            actions={picker}
         />
         {"error" in editor ? (
            <EmptyState
               icon={<CircleAlert />}
               title={`Couldn't load ${selected.firstName}'s availability`}
               description={editor.error}
            />
         ) : (
            <CoordinatorAvailabilityEditor key={selected.id} {...editor} />
         )}
      </PageShell>
   );
}

async function loadEditor(
   coordinatorId: string,
): Promise<CoordinatorAvailabilityEditorProps | { error: string }> {
   const [state, lessonDurations] = await Promise.all([
      fetchCoordinatorAvailabilityEditorState({ coordinatorId }),
      listPrivateLessonDurations(coordinatorId),
   ]);
   if ("error" in state) return state;

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
   if ("error" in preview) return preview;
   if ("error" in overrideList) return overrideList;

   return {
      coordinatorId,
      initialHours: state.hours,
      initialTimezone: state.timezone,
      initialOverrides: overrideList.overrides,
      initialOccurrences: preview.occurrences,
      initialToday: today,
      lessonDurations,
   };
}
