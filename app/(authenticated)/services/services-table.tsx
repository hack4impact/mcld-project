"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ServiceDialog } from "./service-dialog";
import { ServicesDataTable } from "./services-data-table";
import type { CoachOption, ServiceView } from "./queries";

type StatusTab = "all" | "active" | "disabled" | "archived";

export function ServicesTable({
   services,
   coaches,
}: {
   services: ServiceView[];
   coaches: CoachOption[];
}) {
   const [tab, setTab] = React.useState<StatusTab>("active");
   const [editing, setEditing] = React.useState<ServiceView | null>(null);
   const statusTabs: StatusTab[] = ["all", "active", "disabled", "archived"];

   const filtered = React.useMemo(() => {
      return tab === "all"
         ? services
         : services.filter((service) => service.status === tab);
   }, [services, tab]);

   return (
      <>
         <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatusTab)}
            className="w-full"
         >
            <div className="flex items-center justify-between">
               <TabsList className="border border-border">
                  {statusTabs.map((status) => (
                     <TabsTrigger key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                     </TabsTrigger>
                  ))}
               </TabsList>
               <ServiceDialog mode="add" coaches={coaches} />
            </div>

            <TabsContent value={tab}>
               <ServicesDataTable services={filtered} onEdit={setEditing} />
            </TabsContent>
         </Tabs>
         <ServiceDialog
            mode="edit"
            coaches={coaches}
            service={editing}
            open={editing !== null}
            onOpenChange={(v) => {
               if (!v) setEditing(null);
            }}
         />
      </>
   );
}
