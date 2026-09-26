import type { AvailabilityOccurrence } from "@/lib/availability";
import { addDays, splitIntoSlots } from "@/lib/availability-editor";

export const CHECKOUT_EXPIRY_MINUTES = 31;
export const HOLD_MINUTES = CHECKOUT_EXPIRY_MINUTES + 5;

export const NEXT_AVAILABLE_SEARCH_DAYS = 365;

export type BookableSlot = {
   start: string;
   end: string;
   date: string;
   time: string;
};

export type BusyInterval = { start: Date; end: Date };

const MS_PER_MINUTE = 60_000;

function timeZoneOffsetMs(timeZone: string, instant: number): number {
   const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
   }).formatToParts(new Date(instant));
   const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
   const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
   );
   return asUtc - Math.floor(instant / 1000) * 1000;
}

export function zonedTimeToUtc(
   date: string,
   time: string,
   timeZone: string,
): Date {
   const [year, month, day] = date.split("-").map(Number);
   const [hours, minutes] = time.split(":").map(Number);
   const wallClock = Date.UTC(year, month - 1, day, hours, minutes);
   const firstGuess = wallClock - timeZoneOffsetMs(timeZone, wallClock);
   const offset = timeZoneOffsetMs(timeZone, firstGuess);
   return new Date(wallClock - offset);
}

function overlaps(start: number, end: number, busy: BusyInterval[]) {
   return busy.some(
      (interval) =>
         start < interval.end.getTime() && interval.start.getTime() < end,
   );
}

export function generateBookableSlots({
   occurrences,
   timeZone,
   durationMinutes,
   busy,
   now,
}: {
   occurrences: AvailabilityOccurrence[];
   timeZone: string;
   durationMinutes: number;
   busy: BusyInterval[];
   now: Date;
}): BookableSlot[] {
   const slots: BookableSlot[] = [];
   for (const occurrence of occurrences) {
      const { starts } = splitIntoSlots(
         occurrence.start,
         occurrence.end,
         durationMinutes,
      );
      for (const time of starts) {
         const start = zonedTimeToUtc(occurrence.date, time, timeZone);
         const end = new Date(
            start.getTime() + durationMinutes * MS_PER_MINUTE,
         );
         if (start.getTime() <= now.getTime()) continue;
         if (overlaps(start.getTime(), end.getTime(), busy)) continue;
         slots.push({
            start: start.toISOString(),
            end: end.toISOString(),
            date: occurrence.date,
            time,
         });
      }
   }
   return slots.sort((a, b) => a.start.localeCompare(b.start));
}

export function rangeBounds(from: string, to: string, timeZone: string) {
   return {
      start: zonedTimeToUtc(addDays(from, -1), "00:00", timeZone),
      end: zonedTimeToUtc(addDays(to, 2), "00:00", timeZone),
   };
}

export function isStaleHold(createdAt: Date, now: Date): boolean {
   return now.getTime() - createdAt.getTime() > HOLD_MINUTES * MS_PER_MINUTE;
}
