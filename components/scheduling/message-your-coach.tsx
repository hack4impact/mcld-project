"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MessageYourCoachProps = {
   name: string;
   value: string;
   onChange: (value: string) => void;
   className?: string;
};

export function MessageYourCoach({
   name,
   value,
   onChange,
   className,
}: MessageYourCoachProps) {
   const id = React.useId();
   return (
      <div className={className}>
         <Label htmlFor={id} className="mb-2 text-sm font-semibold">
            Message to your coach
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
               (optional)
            </span>
         </Label>
         <Textarea
            id={id}
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            placeholder="e.g. I'm generally free in the mornings — Tuesday afternoons are tough for me this month…"
            className="resize-none"
            maxLength={2000}
         />
      </div>
   );
}
