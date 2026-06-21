import { listCoordinators, listServices } from "./queries";
import { ServicesTable } from "./services-table";

export default async function ServicesPage() {
   const [services, coordinators] = await Promise.all([
      listServices(),
      listCoordinators(),
   ]);

   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <h1 className="text-3xl font-bold">Services</h1>
         <ServicesTable services={services} coordinators={coordinators} />
      </main>
   );
}
