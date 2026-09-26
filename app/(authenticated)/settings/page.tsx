import { Settings } from "lucide-react";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";

export default function SettingsPage() {
   return (
      <PageShell>
         <PageHeader
            title="Settings"
            description="Manage your account and preferences."
         />
         <EmptyState
            icon={<Settings />}
            title="Coming soon"
            description="Account settings will show up here once they're ready."
         />
      </PageShell>
   );
}
