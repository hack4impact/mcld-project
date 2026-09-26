import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Loader2Icon, LockKeyhole } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/utils/supabase/server";

function CheckoutFallback() {
   return (
      <div className="flex w-full max-w-xl items-center justify-center py-24">
         <Loader2Icon
            role="status"
            aria-label="Loading checkout"
            className="size-6 animate-spin text-muted-foreground"
         />
      </div>
   );
}

async function AuthGate({ children }: { children: React.ReactNode }) {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) {
      redirect("/login?next=/checkout");
   }
   return <>{children}</>;
}

export default function CheckoutLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <TooltipProvider>
         <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-20 border-b border-border/70 bg-card/80 backdrop-blur">
               <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
                  <Link href="/" className="flex items-center gap-2">
                     <Image
                        src="/logo.png"
                        alt="MCLD"
                        width={200}
                        height={66}
                        className="h-9 w-auto"
                        priority
                     />
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                     <LockKeyhole className="size-3.5" />
                     Secure checkout
                  </span>
               </div>
            </header>
            <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
               <Suspense fallback={<CheckoutFallback />}>
                  <AuthGate>{children}</AuthGate>
               </Suspense>
            </main>
         </div>
         <Toaster />
      </TooltipProvider>
   );
}
