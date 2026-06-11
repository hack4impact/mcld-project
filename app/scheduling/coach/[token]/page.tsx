import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { getSessionByToken } from "@/app/scheduling/queries";

import { CoachScheduler } from "./coach-scheduler";

export default function CoachSchedulingPage({
   params,
}: {
   params: Promise<{ token: string }>;
}) {
   return (
      <Suspense fallback={<SchedulingFallback />}>
         <CoachSchedulingContent params={params} />
      </Suspense>
   );
}

async function CoachSchedulingContent({
   params,
}: {
   params: Promise<{ token: string }>;
}) {
   const { token } = await params;
   const view = await getSessionByToken(token);

   if (!view || view.role !== "coach") {
      return (
         <Notice
            title="Link not found"
            message="This scheduling link is invalid or has expired."
         />
      );
   }

   if (view.status !== "pending") {
      return (
         <Notice
            title="Nothing to do here"
            message="This session has already moved on — no availability is needed from you right now."
         />
      );
   }
   if (view.coachSlots.length > 0) {
      return (
         <Notice
            title="Availability already sent"
            message="You've already shared your availability for this session. We'll email you once the client picks a time."
         />
      );
   }

   return (
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
         <header className="mb-4">
            <h1 className="font-heading text-2xl font-semibold">
               Set your availability, {view.coachName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
               {view.clientName} booked <strong>{view.serviceTitle}</strong>.
               Select the times that also work for you, and the matching windows
               will turn solid green.
            </p>
         </header>

         <CoachScheduler
            token={token}
            clientName={view.clientName}
            clientSlots={view.clientSlots}
            initialCoachSlots={view.coachSlots}
         />
      </main>
   );
}

function SchedulingFallback() {
   return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center p-4 sm:p-6">
         <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
   );
}

function Notice({ title, message }: { title: string; message: string }) {
   return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-2 p-6 text-center">
         <h1 className="font-heading text-xl font-semibold">{title}</h1>
         <p className="text-sm text-muted-foreground">{message}</p>
      </main>
   );
}
