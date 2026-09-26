import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function FinancePage() {
   try {
      await requireAdmin();
   } catch {
      redirect("/");
   }

   return (
      <main className="flex min-h-screen flex-col p-8">
         <h1 className="text-3xl font-bold">Finance</h1>
      </main>
   );
}
