import { requireAdminArea } from "@/lib/auth/current-user";

export default async function FinancePage() {
   await requireAdminArea();

   return (
      <main className="flex min-h-screen flex-col p-8">
         <h1 className="text-3xl font-bold">Finance</h1>
      </main>
   );
}
