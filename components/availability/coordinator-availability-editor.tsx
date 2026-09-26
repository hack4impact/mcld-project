"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
   listCoordinatorAvailability,
   listCoordinatorAvailabilityOverrides,
   type CoordinatorAvailabilityOverride,
} from "@/app/private-lessons/actions";
import type { AvailabilityOccurrence } from "@/lib/availability";
import {
   buildPreviewWeeks,
   DEFAULT_LESSON_MINUTES,
   PREVIEW_WEEKS,
   previewRange,
   todayInTimeZone,
} from "@/lib/availability-editor";
import type { CoordinatorWeeklyHours } from "@/lib/db/schema";
import { AvailabilityPreview } from "./availability-preview";
import { DateOverridesCard } from "./date-overrides-card";
import { SlotExplainer } from "./slot-explainer";
import { WeeklyHoursCard } from "./weekly-hours-card";

export type CoordinatorAvailabilityEditorProps = {
   coordinatorId: string;
   initialHours: CoordinatorWeeklyHours;
   initialTimezone: string;
   initialOverrides: CoordinatorAvailabilityOverride[];
   initialOccurrences: AvailabilityOccurrence[];
   initialToday: string;
   lessonDurations: number[];
};

export function CoordinatorAvailabilityEditor({
   coordinatorId,
   initialHours,
   initialTimezone,
   initialOverrides,
   initialOccurrences,
   initialToday,
   lessonDurations,
}: CoordinatorAvailabilityEditorProps) {
   const [savedHours, setSavedHours] = useState(initialHours);
   const [timezone, setTimezone] = useState(initialTimezone);
   const [today, setToday] = useState(initialToday);
   const [overrides, setOverrides] = useState(initialOverrides);
   const [occurrences, setOccurrences] = useState(initialOccurrences);
   const [page, setPage] = useState(0);
   const [loading, startLoading] = useTransition();

   const lessonMinutes =
      lessonDurations.length > 0
         ? Math.min(...lessonDurations)
         : DEFAULT_LESSON_MINUTES;

   function reload({
      nextPage = page,
      nextToday = today,
   }: { nextPage?: number; nextToday?: string } = {}) {
      startLoading(async () => {
         const range = previewRange(nextToday, nextPage);
         const [preview, overrideList] = await Promise.all([
            listCoordinatorAvailability({
               coordinatorId,
               from: range.from,
               to: range.to,
            }),
            listCoordinatorAvailabilityOverrides({
               coordinatorId,
               from: nextToday,
            }),
         ]);
         if ("error" in preview || "error" in overrideList) {
            toast.error("Couldn't refresh your availability", {
               description:
                  ("error" in preview && preview.error) ||
                  ("error" in overrideList && overrideList.error) ||
                  undefined,
            });
            return;
         }
         setPage(nextPage);
         setOccurrences(preview.occurrences);
         setOverrides(overrideList.overrides);
      });
   }

   const range = previewRange(today, page);
   const weeks = buildPreviewWeeks({
      weekStart: range.weekStart,
      weeks: PREVIEW_WEEKS,
      today,
      occurrences,
      overrides,
   });

   return (
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
         <div className="flex min-w-0 flex-col gap-6">
            <WeeklyHoursCard
               coordinatorId={coordinatorId}
               initialHours={initialHours}
               initialTimezone={initialTimezone}
               today={today}
               lessonMinutes={lessonMinutes}
               onSaved={(saved) => {
                  const nextToday = todayInTimeZone(saved.timezone);
                  setSavedHours(saved.hours);
                  setTimezone(saved.timezone);
                  setToday(nextToday);
                  reload({ nextToday });
               }}
            />
            <AvailabilityPreview
               weeks={weeks}
               today={today}
               timezone={timezone}
               canGoBack={page > 0}
               loading={loading}
               onPrevious={() => reload({ nextPage: page - 1 })}
               onNext={() => reload({ nextPage: page + 1 })}
            />
         </div>
         <div className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-0 xl:self-start">
            <DateOverridesCard
               coordinatorId={coordinatorId}
               overrides={overrides}
               weeklyHours={savedHours}
               today={today}
               lessonMinutes={lessonMinutes}
               onChanged={() => reload()}
            />
            <SlotExplainer
               lessonDurations={lessonDurations}
               lessonMinutes={lessonMinutes}
            />
         </div>
      </div>
   );
}
