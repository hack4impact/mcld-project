import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Invalid time");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

function toMinutes(time: string): number {
   const [hours, minutes] = time.split(":").map(Number);
   return hours * 60 + minutes;
}

function utcMidnight(ymd: string): number {
   const [year, month, day] = ymd.split("-").map(Number);
   return Date.UTC(year, month - 1, day);
}

function windowsOverlap(
   windows: { start: string; end: string }[],
): boolean {
   const ranges = windows
      .map((window) => ({
         start: toMinutes(window.start),
         end: toMinutes(window.end),
      }))
      .sort((a, b) => a.start - b.start);

   for (let i = 1; i < ranges.length; i++) {
      if (ranges[i]!.start < ranges[i - 1]!.end) return true;
   }
   return false;
}

export const availabilityWindowSchema = z
   .object({
      start: timeSchema,
      end: timeSchema,
      recurrence: z.enum(["weekly", "biweekly"]),
      anchorDate: dateSchema.optional(),
   })
   .refine((window) => toMinutes(window.end) > toMinutes(window.start), {
      message: "End must be after start",
      path: ["end"],
   })
   .refine(
      (window) =>
         window.recurrence !== "biweekly" || window.anchorDate !== undefined,
      {
         message: "Every other week needs an anchor date",
         path: ["anchorDate"],
      },
   );

export const overrideWindowSchema = z
   .object({
      start: timeSchema,
      end: timeSchema,
   })
   .refine((window) => toMinutes(window.end) > toMinutes(window.start), {
      message: "End must be after start",
      path: ["end"],
   });

export const weeklyHoursSchema = z
   .object({
      0: z.array(availabilityWindowSchema),
      1: z.array(availabilityWindowSchema),
      2: z.array(availabilityWindowSchema),
      3: z.array(availabilityWindowSchema),
      4: z.array(availabilityWindowSchema),
      5: z.array(availabilityWindowSchema),
      6: z.array(availabilityWindowSchema),
   })
   .refine((week) => !Object.values(week).some(windowsOverlap), {
      message: "Windows on the same day must not overlap",
   });

export const saveCoordinatorWeeklyHoursSchema = z.object({
   coordinatorId: z.string().uuid(),
   timezone: z.string().min(1).default("America/Toronto"),
   hours: weeklyHoursSchema,
});

export const setCoordinatorAvailabilityOverrideSchema = z.object({
   coordinatorId: z.string().uuid(),
   date: dateSchema,
   windows: z
      .array(overrideWindowSchema)
      .refine((windows) => !windowsOverlap(windows), {
         message: "Windows on the same day must not overlap",
      }),
});

export const clearCoordinatorAvailabilityOverrideSchema = z.object({
   coordinatorId: z.string().uuid(),
   date: dateSchema,
});

export const fetchCoordinatorAvailabilityEditorStateSchema = z.object({
   coordinatorId: z.string().uuid(),
   overrideDate: dateSchema.optional(),
});

export const listCoordinatorAvailabilitySchema = z
   .object({
      coordinatorId: z.string().uuid(),
      from: dateSchema,
      to: dateSchema,
   })
   .refine((range) => utcMidnight(range.from) <= utcMidnight(range.to), {
      message: "from must be on or before to",
      path: ["to"],
   })
   .refine(
      (range) =>
         utcMidnight(range.to) - utcMidnight(range.from) <=
         MAX_RANGE_DAYS * MS_PER_DAY,
      {
         message: "Range cannot be longer than one year",
         path: ["to"],
      },
   );