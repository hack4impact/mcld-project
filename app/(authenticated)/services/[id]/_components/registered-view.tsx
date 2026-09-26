"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-shell";
import type { ServiceView } from "@/app/(authenticated)/services/queries";
import type { ServiceRegistrations } from "../queries";
import { AdultTable } from "./adult-table";
import { KidTable } from "./kid-table";

export function RegisteredView({
   service,
   data,
}: {
   service: ServiceView;
   data: ServiceRegistrations;
}) {
   const count = data.registrations.length;

   return (
      <div className="flex min-h-0 flex-1 flex-col gap-6">
         <PageHeader
            eyebrow={
               <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2.5 w-fit text-muted-foreground"
                  asChild
               >
                  <Link href="/services">
                     <ChevronLeft />
                     Services
                  </Link>
               </Button>
            }
            title={service.title ?? "Service"}
            badge={<Badge variant="secondary">{count} registered</Badge>}
         />

         {data.kind === "adult" ? (
            <AdultTable registrations={data.registrations} />
         ) : (
            <KidTable registrations={data.registrations} />
         )}
      </div>
   );
}
