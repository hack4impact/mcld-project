import { ServicesList } from "@/components/dashboard/services-list";
import { listServices } from "@/lib/services/list-services";
import { parseStatusFilter } from "@/lib/services/service-types";

type PageProps = {
   searchParams: Promise<{
      status?: string;
      page?: string;
   }>;
};

export default async function ProgramsPage({ searchParams }: PageProps) {
   const params = await searchParams;
   const statusFilter = parseStatusFilter(params.status);
   const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

   const result = await listServices({
      type: "programs",
      statusFilter,
      page,
   });

   return (
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
   );
}
