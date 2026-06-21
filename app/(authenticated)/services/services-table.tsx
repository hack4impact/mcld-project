"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ServiceDialog } from "./service-dialog";
import { ServicesDataTable } from "./services-data-table";
import { RegistrationsDialog } from "./registrations-dialog";
import type { CoordinatorOption, ServiceView } from "./queries";

type StatusTab = "all" | "active" | "disabled" | "archived";

export function ServicesTable({
   services,
   coordinators,
   readOnly = false,
}: {
   services: ServiceView[];
   coordinators: CoordinatorOption[];
   readOnly?: boolean;
}) {
   const [tab, setTab] = React.useState<StatusTab>("active");
   const [editing, setEditing] = React.useState<ServiceView | null>(null);
   const [viewing, setViewing] = React.useState<ServiceView | null>(null);
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
               {!readOnly && (
                  <ServiceDialog mode="add" coordinators={coordinators} />
               )}
            </div>

            <TabsContent value={tab}>
               <ServicesDataTable
                  services={filtered}
                  onEdit={setEditing}
                  onViewRegistrations={setViewing}
                  readOnly={readOnly}
               />
            </TabsContent>
         </Tabs>
         {readOnly ? (
            <RegistrationsDialog
               service={viewing}
               open={viewing !== null}
               onOpenChange={(v) => {
                  if (!v) setViewing(null);
               }}
            />
         ) : (
            <ServiceDialog
               mode="edit"
               coordinators={coordinators}
               service={editing}
               open={editing !== null}
               onOpenChange={(v) => {
                  if (!v) setEditing(null);
               }}
            />
         )}
      </>
   );
}
