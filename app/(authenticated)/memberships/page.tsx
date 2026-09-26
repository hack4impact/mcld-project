import { redirect } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";

export default async function MembershipsPage() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   return (
      <PageShell>
         <PageHeader
            title="Memberships"
            description="Subscription plans and the members enrolled in them."
         />
         <EmptyState
            icon={<MonitorSmartphone />}
            title="Coming soon"
            description="Membership management will show up here once it's ready."
         />
      </PageShell>
   );
}
