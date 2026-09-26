import {
   toMinutes,
   utcMidnight,
   windowsConflict,
   ymdFromUtc,
   type AvailabilityOccurrence,
} from "@/lib/availability";
import type {
   AvailabilityOverrideWindow,
   AvailabilityWindow,
} from "@/lib/db/schema";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_NAMES: Record<Weekday, string> = {
   0: "Sunday",
   1: "Monday",
   2: "Tuesday",
   3: "Wednesday",
   4: "Thursday",
   5: "Friday",
   6: "Saturday",
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_TIMEZONE = "America/Toronto";
export const DEFAULT_LESSON_MINUTES = 60;

export function formatTime(time: string): string {
   const [hours, minutes] = time.split(":").map(Number);
   const period = hours < 12 ? "AM" : "PM";
   const hour12 = hours % 12 === 0 ? 12 : hours % 12;
   return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(start: string, end: string): string {
   return `${formatTime(start)} – ${formatTime(end)}`;
}

function fromMinutes(total: number): string {
   return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60,
   ).padStart(2, "0")}`;
}

export function splitIntoSlots(
   start: string,
   end: string,
   durationMinutes: number,
): { starts: string[]; leftoverMinutes: number } {
   const from = toMinutes(start);
   const to = toMinutes(end);
   if (durationMinutes <= 0 || to <= from) {
      return { starts: [], leftoverMinutes: Math.max(0, to - from) };
   }
   const starts: string[] = [];
   let cursor = from;
   while (cursor + durationMinutes <= to) {
      starts.push(fromMinutes(cursor));
      cursor += durationMinutes;
   }
   return { starts, leftoverMinutes: to - cursor };
}

export function describeSlots(
   start: string,
   end: string,
   durationMinutes: number,
): string {
   const { starts, leftoverMinutes } = splitIntoSlots(
      start,
      end,
      durationMinutes,
   );
   const count =
      starts.length === 0
         ? `Too short for a ${durationMinutes}-min lesson`
         : `${starts.length} × ${durationMinutes}-min slot${
              starts.length === 1 ? "" : "s"
           }`;
   if (starts.length === 0 || leftoverMinutes === 0) return count;
   return `${count} · last ${leftoverMinutes} min not bookable`;
}

type EditableWindow = Pick<AvailabilityWindow, "start" | "end"> &
   Partial<Pick<AvailabilityWindow, "recurrence" | "anchorDate">>;

export function validateDayWindows(
   windows: EditableWindow[],
): (string | null)[] {
   return windows.map((window, index) => {
      if (!window.start || !window.end) return "Enter a start and end time";
      if (toMinutes(window.end) <= toMinutes(window.start)) {
         return "End time must be after start time";
      }
      if (window.recurrence === "biweekly" && !window.anchorDate) {
         return "Pick the first week for every-other-week hours";
      }
      const clash = windows.find(
         (other, otherIndex) =>
            otherIndex !== index &&
            other.start &&
            other.end &&
            toMinutes(other.end) > toMinutes(other.start) &&
            windowsConflict(window, other),
      );
      if (clash) {
         return `Overlaps with ${formatTimeRange(clash.start, clash.end)}`;
      }
      return null;
   });
}

export function hasWindowErrors(errors: (string | null)[]): boolean {
   return errors.some((error) => error !== null);
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
   return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).format(now);
}

export function addDays(ymd: string, days: number): string {
   return ymdFromUtc(utcMidnight(ymd) + days * MS_PER_DAY);
}

export function weekdayOf(ymd: string): Weekday {
   return new Date(utcMidnight(ymd)).getUTCDay() as Weekday;
}

export function startOfWeekMonday(ymd: string): string {
   return addDays(ymd, -((weekdayOf(ymd) + 6) % 7));
}

export function nextWeekdayOnOrAfter(ymd: string, weekday: Weekday): string {
   return addDays(ymd, (weekday - weekdayOf(ymd) + 7) % 7);
}

export function formatShortDate(ymd: string, withYear = false): string {
   const [year, month, day] = ymd.split("-").map(Number);
   const base = `${WEEKDAY_SHORT[weekdayOf(ymd)]}, ${MONTHS_SHORT[month - 1]} ${day}`;
   return withYear ? `${base}, ${year}` : base;
}

export function toYmd(date: Date): string {
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
   )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromYmd(ymd: string): Date {
   const [year, month, day] = ymd.split("-").map(Number);
   return new Date(year, month - 1, day);
}

export function formatTimeZone(timeZone: string, onDate: string): string {
   const city = timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
   try {
      const offset = new Intl.DateTimeFormat("en-US", {
         timeZone,
         timeZoneName: "shortOffset",
      })
         .formatToParts(new Date(utcMidnight(onDate) + 12 * 60 * 60 * 1000))
         .find((part) => part.type === "timeZoneName")?.value;
      return offset ? `${city} (${offset})` : city;
   } catch {
      return timeZone;
   }
}

const COMMON_TIMEZONES = [
   "America/St_Johns",
   "America/Halifax",
   "America/Toronto",
   "America/New_York",
   "America/Winnipeg",
   "America/Chicago",
   "America/Regina",
   "America/Edmonton",
   "America/Denver",
   "America/Vancouver",
   "America/Los_Angeles",
   "Europe/London",
   "Europe/Paris",
   "UTC",
];

export function timeZoneOptions(current: string): string[] {
   return COMMON_TIMEZONES.includes(current)
      ? COMMON_TIMEZONES
      : [current, ...COMMON_TIMEZONES];
}

export const PREVIEW_WEEKS = 4;

export function previewRange(today: string, page: number) {
   const weekStart = addDays(
      startOfWeekMonday(today),
      page * PREVIEW_WEEKS * 7,
   );
   return {
      weekStart,
      from: weekStart < today ? today : weekStart,
      to: addDays(weekStart, PREVIEW_WEEKS * 7 - 1),
   };
}

export type PreviewDay = {
   date: string;
   isPast: boolean;
   windows: AvailabilityOccurrence[];
   override: "custom" | "day_off" | null;
};

export function buildPreviewWeeks({
   weekStart,
   weeks,
   today,
   occurrences,
   overrides,
}: {
   weekStart: string;
   weeks: number;
   today: string;
   occurrences: AvailabilityOccurrence[];
   overrides: { date: string; windows: AvailabilityOverrideWindow[] }[];
}): PreviewDay[][] {
   const byDate = new Map<string, AvailabilityOccurrence[]>();
   for (const occurrence of occurrences) {
      const list = byDate.get(occurrence.date) ?? [];
      list.push(occurrence);
      byDate.set(occurrence.date, list);
   }
   const overrideByDate = new Map(
      overrides.map((override) => [override.date, override.windows]),
   );

   return Array.from({ length: weeks }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
         const date = addDays(weekStart, week * 7 + day);
         const isPast = utcMidnight(date) < utcMidnight(today);
         const override = overrideByDate.get(date);
         return {
            date,
            isPast,
            windows: isPast
               ? []
               : [...(byDate.get(date) ?? [])].sort(
                    (a, b) => toMinutes(a.start) - toMinutes(b.start),
                 ),
            override:
               isPast || override === undefined
                  ? null
                  : override.length === 0
                    ? "day_off"
                    : "custom",
         };
      }),
   );
}
