import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listForms } from "./queries";
import { FormsTable } from "./_components/forms-table";

export default function FormsPage() {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
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
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
         <h1 className="shrink-0 text-3xl font-bold">Forms</h1>
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <FormsTable forms={forms} />
         </div>
      </main>
   );
}