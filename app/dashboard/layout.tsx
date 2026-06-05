import { requireAdmin } from "@/lib/admin/require-admin";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const { profile, user } = await requireAdmin();

   const displayName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim().toUpperCase()
      : (user.email ?? "ADMIN").toUpperCase();

   return (
      <div className="flex min-h-screen bg-[#e8f1f6]">
         <DashboardSidebar />
         <div className="flex min-w-0 flex-1 flex-col">
            <DashboardHeader displayName={displayName} />
            <main className="flex-1">{children}</main>
         </div>
      </div>
   );
}
