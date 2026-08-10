import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AccountLayout({
   children,
}: {
   children: ReactNode;
}) {
   const user = await getCurrentUser();

   if (!user) {
      redirect("/login");
   }

   return (
      <div className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto">
         {children}
      </div>
   );
}
