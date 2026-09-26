"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describeSlots } from "@/lib/availability-editor";
import { cn } from "@/lib/utils";

export function TimeWindowRow({
   start,
   end,
   error,
   lessonMinutes,
   label,
   onChange,
   onRemove,
   children,
}: {
   start: string;
   end: string;
   error: string | null;
   lessonMinutes: number;
   label: string;
   onChange: (next: { start: string; end: string }) => void;
   onRemove: () => void;
   children?: React.ReactNode;
}) {
   const invalid = error !== null;
   return (
      <div className="flex flex-col gap-1">
         <div className="flex flex-wrap items-center gap-2">
            <Input
               type="time"
               step={300}
               required
               value={start}
               aria-label={`${label} start`}
               aria-invalid={invalid || undefined}
               className="w-[8.5rem] tabular-nums md:w-[7.75rem]"
               onChange={(e) => onChange({ start: e.target.value, end })}
            />
            <span className="text-muted-foreground">–</span>
            <Input
               type="time"
               step={300}
               required
               value={end}
               aria-label={`${label} end`}
               aria-invalid={invalid || undefined}
               className="w-[8.5rem] tabular-nums md:w-[7.75rem]"
               onChange={(e) => onChange({ start, end: e.target.value })}
            />
            {children}
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               aria-label={`Remove ${label}`}
               className="text-muted-foreground hover:text-destructive"
               onClick={onRemove}
            >
               <Trash2 />
            </Button>
         </div>
         <p
            className={cn(
               "text-xs",
               invalid
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
            )}
            role={invalid ? "alert" : undefined}
         >
            {error ?? describeSlots(start, end, lessonMinutes)}
         </p>
      </div>
   );
}
