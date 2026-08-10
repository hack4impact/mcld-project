import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { requireUser } from "@/lib/auth/require-user";
import { RegistrationsView } from "./_components/registrations-view";
import { listRegistrationsForUser } from "./queries";

export default function RegistrationsPage() {
   return (
      <Suspense
         fallback={
            <div className="flex min-h-screen items-center justify-center">
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

   const registrations = await listRegistrationsForUser(userId);

   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-6 overflow-hidden p-8">
         <div className="flex shrink-0 flex-col gap-2">
            <div className="flex items-center gap-3">
               <h1 className="font-heading text-3xl font-bold">
                  My Registrations
               </h1>
               <Badge variant="secondary">
                  {registrations.length} registered
               </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
               Services you&apos;re registered for.
            </p>
         </div>

         <RegistrationsView registrations={registrations} />
      </main>
   );
}
