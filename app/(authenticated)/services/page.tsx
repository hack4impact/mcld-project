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
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function ServicesPage() {
   const role = await getUserRole();

   if (role === ROLES.ADMIN) {
      const [services, coordinators, forms] = await Promise.all([
         listServices(),
         listCoordinators(),
         listForms(),
      ]);

      return (
         <PageShell fill>
            <PageHeader
               title="Services"
               description="Create and manage programs, lessons and webinars offered to families."
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
               <ServicesTable
                  services={services}
                  coordinators={coordinators}
                  forms={forms}
               />
            </div>
         </PageShell>
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
         <PageShell fill>
            <PageHeader
               title="Services"
               description="Services you coordinate. View the people registered and their form answers."
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
               <ServicesTable
                  services={services}
                  coordinators={[]}
                  forms={[]}
                  readOnly
               />
            </div>
         </PageShell>
      );
   }

   redirect("/");
}
