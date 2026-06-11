import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Loader2Icon } from "lucide-react";

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
            <header className="border-b border-border/60 bg-card/50 backdrop-blur">
               <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
                  <Link href="/" className="flex items-center gap-2">
                     <Image
                        src="/logo.png"
                        alt="MCLD"
                        width={97}
                        height={32}
                        style={{ width: "auto", height: "auto" }}
                        priority
                     />
                  </Link>
                  <span className="font-heading text-xs font-medium uppercase text-muted-foreground">
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
