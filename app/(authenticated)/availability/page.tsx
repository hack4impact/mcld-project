import { Suspense } from "react";

import { Spinner } from "@/components/ui/spinner";
import { AvailabilityContent } from "./availability-content";

export default function AvailabilityPage({
   searchParams,
}: {
   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
   return (
      <Suspense
         fallback={
            <div className="flex flex-1 items-center justify-center">
               <Spinner className="size-8 text-muted-foreground" />
            </div>
         }
      >
         <AvailabilityContent searchParams={searchParams} />
      </Suspense>
   );
}
