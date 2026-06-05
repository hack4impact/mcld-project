"use client";

import { Archive, Ban, CircleCheck, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateServiceStatus } from "@/app/dashboard/services/actions";
import type { ServiceStatus } from "@/lib/services/service-types";
import { Button } from "@/components/ui/button";

type ServiceRowActionsProps = {
   serviceId: string;
   status: ServiceStatus;
   onEdit: () => void;
};

export function ServiceRowActions({
   serviceId,
   status,
   onEdit,
}: ServiceRowActionsProps) {
   const router = useRouter();
   const [pending, startTransition] = useTransition();
   const [error, setError] = useState<string | null>(null);

   function setStatus(next: "disabled" | "archived" | "active") {
      setError(null);
      startTransition(async () => {
         const result = await updateServiceStatus(serviceId, next);
         if (result?.error) {
            setError(result.error);
            return;
         }
         router.refresh();
      });
   }

   return (
      <div className="flex flex-col items-end gap-1">
         <div className="flex items-center justify-end gap-1">
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               onClick={onEdit}
               aria-label="Edit service"
            >
               <Pencil className="size-4 text-foreground" />
            </Button>

            {status === "active" && (
               <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => setStatus("disabled")}
                  aria-label="Disable service"
               >
                  <Ban className="size-4 text-foreground" />
               </Button>
            )}

            {status === "disabled" && (
               <>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     disabled={pending}
                     onClick={() => setStatus("active")}
                     aria-label="Enable service"
                  >
                     <CircleCheck className="size-4 text-emerald-600" />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     disabled={pending}
                     onClick={() => setStatus("archived")}
                     aria-label="Archive service"
                  >
                     <Archive className="size-4 text-foreground" />
                  </Button>
               </>
            )}
         </div>
         {error && (
            <p className="max-w-48 text-right text-xs text-destructive">
               {error}
            </p>
         )}
      </div>
   );
}
