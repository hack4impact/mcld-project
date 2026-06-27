"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ServiceDialog } from "./service-dialog";
import { ServicesDataTable } from "./services-data-table";
import type { CoordinatorOption, ServiceView } from "./queries";

type StatusTab = "all" | "active" | "disabled" | "archived";

export function ServicesTable({
   services,
   coordinators,
}: {
   services: ServiceView[];
   coordinators: CoordinatorOption[];
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
         <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatusTab)}
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden"
         >
            <div className="flex shrink-0 items-center justify-between">
               <TabsList className="border border-border">
                  {statusTabs.map((status) => (
                     <TabsTrigger key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                     </TabsTrigger>
                  ))}
               </TabsList>
               <ServiceDialog mode="add" coordinators={coordinators} />
            </div>

            <TabsContent
               value={tab}
               className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
            >
               <ServicesDataTable services={filtered} onEdit={setEditing} />
            </TabsContent>
         </Tabs>
         <ServiceDialog
            mode="edit"
            coordinators={coordinators}
            service={editing}
            open={editing !== null}
            onOpenChange={(v) => {
               if (!v) setEditing(null);
            }}
         />
      </div>
   );
}
