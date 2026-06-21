import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";

import {
   listCoordinators,
   listServices,
   listServicesForCoordinator,
} from "./queries";
import { ServicesTable } from "./services-table";

export default async function ServicesPage() {
   const role = await getUserRole();

   if (role === ROLES.ADMIN) {
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

   if (role === ROLES.COORDINATOR) {
      const supabase = await createClient();
      const {
         data: { user },
      } = await supabase.auth.getUser();
      if (!user) redirect("/login");

      const services = await listServicesForCoordinator(user.id);

      return (
         <main className="flex min-h-screen flex-col gap-6 p-8">
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-sm text-muted-foreground">
               Services you coordinate. View the people registered and their
               form answers.
            </p>
            <ServicesTable services={services} coordinators={[]} readOnly />
         </main>
      );
   }

   redirect("/");
}
