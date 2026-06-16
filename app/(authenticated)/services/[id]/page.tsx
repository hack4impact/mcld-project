import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getService } from "@/app/(authenticated)/services/queries";
import { getServiceRegistrations } from "./queries";
import { RegisteredView } from "./_components/registered-view";

export default function ServiceRegisteredPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
   return (
      <Suspense fallback={<Spinner className="size-8 text-muted-foreground" />}>
         <PageContent params={params} />
      </Suspense>
   );
}

async function PageContent({ params }: { params: Promise<{ id: string }> }) {
   await connection();

   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   const { id } = await params;
   const service = await getService(id);
   if (!service) redirect("/services");

   const registrations = await getServiceRegistrations(id);

   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <RegisteredView service={service} data={registrations} />
      </main>
   );
}
