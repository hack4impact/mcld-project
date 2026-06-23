import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function MembershipsPage() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   return (
      <main className="flex min-h-screen flex-col p-8">
         <h1 className="text-3xl font-bold">Memberships</h1>
      </main>
   );
}
