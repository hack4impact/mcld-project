import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { RegistrationsView } from "./_components/registrations-view";
import { listRegistrationsForUser } from "./queries";

export default function RegistrationsPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <RegistrationsContent />
      </Suspense>
   );
}

async function RegistrationsContent() {
   let userId: string;
   try {
      ({ userId } = await requireUser());
   } catch {
      redirect("/");
   }

   const { upcoming, past } = await listRegistrationsForUser(userId);

   return (
      <PageShell fill>
         <PageHeader
            title="My registrations"
            badge={<Badge variant="secondary">{upcoming.length} upcoming</Badge>}
            description="Programs and private lessons you're registered for."
         />

         <RegistrationsView upcoming={upcoming} past={past} />
      </PageShell>
   );
}
