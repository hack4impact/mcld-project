import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";

export default async function FinancePage() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   return (
      <PageShell>
         <PageHeader
            title="Finance"
            description="Payments, payouts and revenue across all services."
         />
         <EmptyState
            icon={<CreditCard />}
            title="Coming soon"
            description="Financial reports will show up here once they're ready."
         />
      </PageShell>
   );
}
