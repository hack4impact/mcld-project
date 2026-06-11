import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { getSessionByToken } from "@/app/scheduling/queries";

import { ClientConfirm } from "./client-confirm";

export default function ConfirmSchedulingPage({
   params,
}: {
   params: Promise<{ token: string }>;
}) {
   return (
      <Suspense fallback={<ConfirmFallback />}>
         <ConfirmSchedulingContent params={params} />
      </Suspense>
   );
}

async function ConfirmSchedulingContent({
   params,
}: {
   params: Promise<{ token: string }>;
}) {
   const { token } = await params;
   const view = await getSessionByToken(token);

   if (!view || view.role !== "client") {
      return (
         <Notice
            title="Link not found"
            message="This scheduling link is invalid or has expired."
         />
      );
   }

   if (view.status === "confirmed") {
      return (
         <Notice
            title="You're all set"
            message={`Your ${view.serviceTitle} session is confirmed${
               view.scheduledAt ? ` for ${formatDateTime(view.scheduledAt)}` : ""
            }.`}
         />
      );
   }

   if (view.status !== "pending" || view.overlap.length === 0) {
      return (
         <Notice
            title="Hang tight"
            message={`${view.coachName} hasn't shared matching times yet. We'll email you as soon as they do.`}
         />
      );
   }

   return (
      <main className="mx-auto w-full max-w-lg p-4 sm:p-6">
         <header className="mb-4">
            <h1 className="font-heading text-2xl font-semibold">
               Pick your time
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
               {view.coachName} is available on these days for{" "}
               <strong>{view.serviceTitle}</strong> ({view.durationMinutes}{" "}
               min). Pick the exact time that works best for you.
            </p>
         </header>

         <ClientConfirm
            token={token}
            serviceTitle={view.serviceTitle}
            coachName={view.coachName}
            windows={view.overlap}
            durationMinutes={view.durationMinutes}
         />
      </main>
   );
}

function formatDateTime(iso: string): string {
   return new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
   });
}

function ConfirmFallback() {
   return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg items-center justify-center p-4 sm:p-6">
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
