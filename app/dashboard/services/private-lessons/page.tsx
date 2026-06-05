import { ServicesList } from "@/components/dashboard/services-list";
import { listCoaches, listServices } from "@/lib/services/list-services";
import { parseStatusFilter } from "@/lib/services/service-types";

type PageProps = {
   searchParams: Promise<{
      status?: string;
      page?: string;
   }>;
};

export default async function PrivateLessonsPage({ searchParams }: PageProps) {
   const params = await searchParams;
   const statusFilter = parseStatusFilter(params.status);
   const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

   const [result, coaches] = await Promise.all([
      listServices({
         type: "private_lessons",
         statusFilter,
         page,
      }),
      listCoaches(),
   ]);

   return (
      <ServicesList
         type="private_lessons"
         title="Private Lessons"
         items={result.items}
         total={result.total}
         page={result.page}
         pageSize={result.pageSize}
         totalPages={result.totalPages}
         coaches={coaches}
      />
   );
}
