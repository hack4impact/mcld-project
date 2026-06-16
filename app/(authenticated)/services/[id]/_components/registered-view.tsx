"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-col gap-6">
         <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
               <Link href="/services">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Services
               </Link>
            </Button>
         </div>

         <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{service.title ?? "Service"}</h1>
            <Badge variant="secondary">
               {count} registered
            </Badge>
         </div>

         {data.kind === "adult" ? (
            <AdultTable registrations={data.registrations} />
         ) : (
            <KidTable registrations={data.registrations} />
         )}
      </div>
   );
}
