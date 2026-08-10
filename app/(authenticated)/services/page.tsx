import { listCoordinators, listServices } from "./queries";
import { listForms } from "@/app/(authenticated)/forms/queries";
import { requireAdminArea } from "@/lib/auth/current-user";
import { ServicesTable } from "./services-table";

export default async function ServicesPage() {
   await requireAdminArea();

   const [services, coordinators, forms] = await Promise.all([
      listServices(),
      listCoordinators(),
      listForms(),
   ]);

   return (
      <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
         <h1 className="shrink-0 text-3xl font-bold">Services</h1>
         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ServicesTable
               services={services}
               coordinators={coordinators}
               forms={forms}
            />
         </div>
      </main>
   );
}
