"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";

import type { CoordinatorOption } from "@/app/(authenticated)/services/queries";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

export function CoordinatorPicker({
   coordinators,
   selectedId,
}: {
   coordinators: CoordinatorOption[];
   selectedId: string | null;
}) {
   const router = useRouter();
   const [pending, startTransition] = useTransition();
   const [value, setValue] = useOptimistic(selectedId ?? "");

   return (
      <Select
         value={value}
         onValueChange={(id) =>
            startTransition(() => {
               setValue(id);
               router.replace(`/availability?coordinator=${id}`);
            })
         }
      >
         <SelectTrigger aria-label="Coordinator" className="h-9! min-w-56">
            {pending ? (
               <Loader2 className="animate-spin text-muted-foreground" />
            ) : (
               <UserRound className="text-muted-foreground" />
            )}
            <SelectValue placeholder="Choose a coordinator" />
         </SelectTrigger>
         <SelectContent align="end">
            {coordinators.map((coordinator) => (
               <SelectItem key={coordinator.id} value={coordinator.id}>
                  {coordinator.firstName} {coordinator.lastName}
               </SelectItem>
            ))}
         </SelectContent>
      </Select>
   );
}
