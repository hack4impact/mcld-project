import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getService } from "@/app/(authenticated)/services/queries";
import { getServiceRegistrations } from "./queries";
import { RegisteredView } from "./_components/registered-view";

export default async function ServiceRegisteredPage({
   params,
}: {
   params: Promise<{ id: string }>;
}) {
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
