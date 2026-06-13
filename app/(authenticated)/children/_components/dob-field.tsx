"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";

export function toISODate(date: Date): string {
   const y = date.getFullYear();
   const m = String(date.getMonth() + 1).padStart(2, "0");
   const d = String(date.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

export function fromISODate(value: string | undefined): Date | undefined {
   if (!value) return undefined;
   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
   const [y, m, d] = value.split("-").map(Number);
   if (!y || !m || !d) return undefined;
   const date = new Date(y, m - 1, d);
   if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
   ) {
      return undefined;
   }
   return date;
}

type DobFieldProps = {
   id?: string;
   value: string;
   onChange: (value: string) => void;
};

export function DobField({ id = "dob", value, onChange }: DobFieldProps) {
   const [open, setOpen] = useState(false);
   const selected = fromISODate(value);

   return (
      <>
         <ButtonGroup className="w-full">
            <Input
               id={id}
               value={value}
               placeholder="yyyy-mm-dd"
               onChange={(e) => onChange(e.target.value)}
               onBlur={() => {
                  const parsed = fromISODate(value.trim());
                  if (parsed) onChange(toISODate(parsed));
               }}
            />
            <Popover open={open} onOpenChange={setOpen}>
               <PopoverTrigger asChild>
                  <Button
                     type="button"
                     variant="outline"
                     size="icon"
                     aria-label="Pick date"
                  >
                     <CalendarIcon className="size-4" />
                  </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                     mode="single"
                     selected={selected}
                     onSelect={(date) => {
                        if (!date) return;
                        onChange(toISODate(date));
                        setOpen(false);
                     }}
                     disabled={(date) => date > new Date()}
                  />
               </PopoverContent>
            </Popover>
         </ButtonGroup>
         <input type="hidden" name="dob" value={value} />
      </>
   );
}