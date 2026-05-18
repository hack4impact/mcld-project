"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MessageYourCoachProps = {
   name: string;
   value: string;
   onChange: (value: string) => void;
   pending?: boolean;
   className?: string;
};

export function MessageYourCoach({
   name,
   value,
   onChange,
   pending = false,
   className,
}: MessageYourCoachProps) {
   const id = React.useId();
   return (
      <div className={className}>
         <Label htmlFor={id} className="mb-2 text-base font-semibold">
            Message to your coach
            <span className="ml-2 text-sm font-normal text-muted-foreground">
               Optional
            </span>
         </Label>
         <div className="grid gap-2 md:grid-cols-[1fr_260px]">
            <Textarea
               id={id}
               name={name}
               value={value}
               onChange={(event) => onChange(event.target.value)}
               rows={3}
               placeholder="e.g. I'm generally free on mornings - Tuesday afternoons are tough for me this month..."
               className="min-h-28 resize-none"
               maxLength={2000}
            />
            <Button
               type="submit"
               size="lg"
               disabled={pending}
               className="min-h-28 text-lg font-semibold"
            >
               {pending ? "Submitting..." : "Submit Availability"}
            </Button>
         </div>
      </div>
   );
}
