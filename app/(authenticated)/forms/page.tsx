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
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <h1 className="text-3xl font-bold">Forms</h1>
         <FormsTable forms={forms} />
      </main>
   );
}