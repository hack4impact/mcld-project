import { listCoaches, listServices } from "./queries";
import { listForms } from "@/app/(authenticated)/forms/queries";
import { ServicesTable } from "./services-table";

export default async function ServicesPage() {
   const [services, coaches, forms] = await Promise.all([
      listServices(),
      listCoaches(),
      listForms(),
   ]);

   return (
      <main className="flex min-h-screen flex-col gap-6 p-8">
         <h1 className="text-3xl font-bold">Services</h1>
         <ServicesTable services={services} coaches={coaches} forms={forms} />
      </main>
   );
}
