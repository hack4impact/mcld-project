"use client";

import { Archive, Ban, CircleCheck, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateServiceStatus } from "@/app/dashboard/services/actions";
import type { ServiceType } from "@/lib/services/list-services";
import { Button } from "@/components/ui/button";

type ServiceRowActionsProps = {
   serviceId: string;
   type: ServiceType;
   status: string;
   onEdit: () => void;
};

export function ServiceRowActions({
   serviceId,
   type,
   status,
   onEdit,
}: ServiceRowActionsProps) {
   const router = useRouter();
   const [pending, startTransition] = useTransition();

   function setStatus(next: "disabled" | "archived" | "active") {
      startTransition(async () => {
         await updateServiceStatus(serviceId, next, type);
         router.refresh();
      });
   }

   return (
      <div className="flex items-center justify-end gap-1">
         <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label="Edit service"
         >
            <Pencil className="size-4 text-[#1a3d52]" />
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
               <Ban className="size-4 text-[#1a3d52]" />
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
                  <Archive className="size-4 text-[#1a3d52]" />
               </Button>
            </>
         )}
      </div>
   );
}
