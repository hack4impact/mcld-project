"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChildView } from "../queries";

export function ChildActionsCell({
   child,
   onEdit,
}: {
   child: ChildView;
   onEdit: (child: ChildView) => void;
}) {
   return (
      <div className="flex items-center justify-end">
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit child"
                  onClick={() => onEdit(child)}
               >
                  <Pencil />
               </Button>
            </TooltipTrigger>
            <TooltipContent>Edit child</TooltipContent>
         </Tooltip>
      </div>
   );
}