import { Suspense } from "react";
import { ServicesList } from "@/components/dashboard/services-list";
import {
   listServices,
   type ServiceStatusFilter,
} from "@/lib/services/list-services";

type PageProps = {
   searchParams: Promise<{
      status?: string;
      page?: string;
   }>;
};

export default async function ProgramsPage({ searchParams }: PageProps) {
   const params = await searchParams;
   const statusFilter = (params.status as ServiceStatusFilter) || "all";
   const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

   const result = await listServices({
      type: "programs",
      statusFilter,
      page,
   });

   return (
      <Suspense fallback={<div className="p-6">Loading programs…</div>}>
         <ServicesList
            type="programs"
            title="Programs"
            items={result.items}
            total={result.total}
            page={result.page}
            pageSize={result.pageSize}
            totalPages={result.totalPages}
            coaches={[]}
         />
      </Suspense>
   );
}
