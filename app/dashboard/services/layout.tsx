import { ServicesTabs } from "@/components/dashboard/services-tabs";

export default function ServicesLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="flex flex-col">
         <ServicesTabs />
         {children}
      </div>
   );
}
