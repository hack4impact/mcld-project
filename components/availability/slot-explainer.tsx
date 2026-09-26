import { Info } from "lucide-react";

import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { formatTime, splitIntoSlots } from "@/lib/availability-editor";

const EXAMPLE_START = "09:00";
const EXAMPLE_END = "11:30";

export function SlotExplainer({
   lessonDurations,
   lessonMinutes,
}: {
   lessonDurations: number[];
   lessonMinutes: number;
}) {
   const { starts, leftoverMinutes } = splitIntoSlots(
      EXAMPLE_START,
      EXAMPLE_END,
      lessonMinutes,
   );
   const total = 150;

   return (
      <Card size="sm">
         <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
               <Info className="size-4 text-primary" />
               How windows split into lesson slots
            </CardTitle>
            <CardDescription className="text-[0.8rem]">
               Each window splits into back-to-back slots the length of the
               lesson, starting at the window&apos;s start time. Time left over
               at the end is too short for a lesson.
            </CardDescription>
         </CardHeader>
         <CardContent className="flex flex-col gap-2 px-4">
            <div
               className="flex h-9 overflow-hidden rounded-lg border border-border text-[0.7rem] font-semibold"
               aria-hidden
            >
               {starts.map((start) => (
                  <div
                     key={start}
                     className="flex items-center justify-center border-r border-primary/20 bg-primary/10 text-primary"
                     style={{ width: `${(lessonMinutes / total) * 100}%` }}
                  >
                     {formatTime(start)}
                  </div>
               ))}
               {leftoverMinutes > 0 && (
                  <div
                     className="flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,transparent_6px_12px)] text-muted-foreground"
                     style={{ width: `${(leftoverMinutes / total) * 100}%` }}
                  >
                     {leftoverMinutes} min
                  </div>
               )}
            </div>
            <p className="text-xs text-muted-foreground">
               {formatTime(EXAMPLE_START)} – {formatTime(EXAMPLE_END)} with a{" "}
               {lessonMinutes}-minute lesson offers{" "}
               {starts.map(formatTime).join(" and ")}.
            </p>
            <p className="text-xs text-muted-foreground">
               {lessonDurations.length > 0
                  ? `Your private lessons are ${lessonDurations
                       .map((minutes) => `${minutes} min`)
                       .join(", ")} long.`
                  : "You don't coordinate any active private lessons yet; slot hints assume 60 minutes."}
            </p>
         </CardContent>
      </Card>
   );
}
