import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";
import { listForms } from "@/app/(authenticated)/forms/queries";

import {
   listCoordinators,
   listServices,
   listServicesForCoordinator,
} from "./queries";
import { ServicesTable } from "./services-table";

export default async function ServicesPage() {
   const role = await getUserRole();

   if (role === ROLES.ADMIN) {
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

   if (role === ROLES.COORDINATOR) {
      const supabase = await createClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      const services = await listServicesForCoordinator(user.id);

      return (
         <main className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
            <h1 className="shrink-0 text-3xl font-bold">Services</h1>
            <p className="shrink-0 text-sm text-muted-foreground">
               Services you coordinate. View the people registered and their
               form answers.
            </p>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
               <ServicesTable
                  services={services}
                  coordinators={[]}
                  forms={[]}
                  readOnly
               />
            </div>
         </main>
      );
   }

   redirect("/");
}
