import Link from "next/link";
import { signout } from "@/app/login/actions";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <div className="bg-background flex min-h-screen flex-col">
         <header className="border-border border-b">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4">
               <div className="flex items-center justify-between gap-4">
                  <Link
                     href="/dashboard/services"
                     className="text-lg font-medium tracking-tight"
                  >
                     Dashboard
                  </Link>
                  <form>
                     <Button formAction={signout} variant="outline" size="sm">
                        Sign out
                     </Button>
                  </form>
               </div>
               <DashboardNav />
            </div>
         </header>
         <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</div>
      </div>
   );
}
