import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listForms } from "./queries";
import { FormsTable } from "./_components/forms-table";

export default function FormsPage() {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <FormsContent />
      </Suspense>
   );
}

async function FormsContent() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   const forms = await listForms();

   return (
      <PageShell fill>
         <PageHeader
            title="Forms"
            description="Registration questions families answer when they sign up for a service."
         />
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <FormsTable forms={forms} />
         </div>
      </PageShell>
   );
}