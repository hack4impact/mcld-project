"use client";

import { useState, useTransition } from "react";
import { CalendarOff, CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from "@/components/ui/tooltip";
import {
   clearCoordinatorAvailabilityOverride,
   type CoordinatorAvailabilityOverride,
} from "@/app/private-lessons/actions";
import { formatShortDate, formatTimeRange } from "@/lib/availability-editor";
import type { CoordinatorWeeklyHours } from "@/lib/db/schema";
import { OverrideDialog } from "./override-dialog";

export function DateOverridesCard({
   coordinatorId,
   overrides,
   weeklyHours,
   today,
   lessonMinutes,
   onChanged,
}: {
   coordinatorId: string;
   overrides: CoordinatorAvailabilityOverride[];
   weeklyHours: CoordinatorWeeklyHours;
   today: string;
   lessonMinutes: number;
   onChanged: () => void;
}) {
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editDate, setEditDate] = useState<string | null>(null);
   const [removingDate, setRemovingDate] = useState<string | null>(null);
   const [, startRemoving] = useTransition();

   function openFor(date: string | null) {
      setEditDate(date);
      setDialogOpen(true);
   }

   function handleRemove(date: string) {
      setRemovingDate(date);
      startRemoving(async () => {
         const result = await clearCoordinatorAvailabilityOverride({
            coordinatorId,
            date,
         });
         setRemovingDate(null);
         if ("error" in result) {
            toast.error("Override not removed", {
               description: result.error,
            });
            return;
         }
         toast.success(`${formatShortDate(date)} is back to your weekly hours`);
         onChanged();
      });
   }

   return (
      <Card size="sm">
         <CardHeader className="border-b px-4">
            <CardTitle className="text-sm font-semibold">
               Date overrides
            </CardTitle>
            <CardDescription className="text-[0.8rem]">
               Replace your weekly hours on a specific date, or take the day
               off.
            </CardDescription>
            <CardAction>
               <Button type="button" size="sm" onClick={() => openFor(null)}>
                  <CalendarPlus />
                  Add
               </Button>
            </CardAction>
         </CardHeader>
         <CardContent className="px-2">
            {overrides.length === 0 ? (
               <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No upcoming overrides. Your weekly hours apply every day.
               </p>
            ) : (
               <ul className="flex flex-col">
                  {overrides.map((override) => {
                     const dayOff = override.windows.length === 0;
                     return (
                        <li
                           key={override.date}
                           className="group/override flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                        >
                           <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="text-sm font-semibold text-foreground">
                                 {formatShortDate(
                                    override.date,
                                    override.date.slice(0, 4) !==
                                       today.slice(0, 4),
                                 )}
                              </span>
                              {dayOff ? (
                                 <Badge variant="muted" className="gap-1">
                                    <CalendarOff />
                                    Day off
                                 </Badge>
                              ) : (
                                 <span className="text-xs text-muted-foreground">
                                    {override.windows
                                       .map((w) =>
                                          formatTimeRange(w.start, w.end),
                                       )
                                       .join(", ")}
                                 </span>
                              )}
                           </div>
                           <div className="flex shrink-0 items-center gap-0.5">
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon-sm"
                                       aria-label={`Edit override on ${formatShortDate(override.date)}`}
                                       onClick={() => openFor(override.date)}
                                    >
                                       <Pencil />
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon-sm"
                                       aria-label={`Remove override on ${formatShortDate(override.date)}`}
                                       className="hover:text-destructive"
                                       disabled={removingDate === override.date}
                                       onClick={() =>
                                          handleRemove(override.date)
                                       }
                                    >
                                       <Trash2 />
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                    Remove — use weekly hours
                                 </TooltipContent>
                              </Tooltip>
                           </div>
                        </li>
                     );
                  })}
               </ul>
            )}
         </CardContent>

         <OverrideDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            coordinatorId={coordinatorId}
            initialDate={editDate}
            overrides={overrides}
            weeklyHours={weeklyHours}
            today={today}
            lessonMinutes={lessonMinutes}
            onSaved={onChanged}
         />
      </Card>
   );
}
