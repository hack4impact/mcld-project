export type TimeSlot = { start: string; end: string };

export const SLOT_MINUTES = 15;

export const WEEKDAY = {
   sun: 0,
   mon: 1,
   tue: 2,
   wed: 3,
   thu: 4,
   fri: 5,
   sat: 6,
} as const;

export type Weekday = keyof typeof WEEKDAY;

export type CalendarDaysConfig = {
   /** Number of 7-day periods starting from today (or `anchor`). */
   weeks: number;
   /** Which weekdays appear as columns (e.g. `['mon', 'tue', 'wed', 'thu', 'fri']`). */
   daysOfWeek: Weekday[];
   /** Defaults to today at local midnight. */
   anchor?: Date;
};

export type CalendarRange = {
   weeks: Date[][];
   days: Date[];
};

export function slotKey(date: Date): string {
   return date.toISOString();
}

export function parseSlotKey(key: string): Date {
   return new Date(key);
}

function isSameLocalDay(a: Date, b: Date): boolean {
   return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
   );
}

/** Inclusive slot keys between two times on the same local day (for fast drag fill). */
export function getSlotKeysBetween(fromKey: string, toKey: string): string[] {
   const from = parseSlotKey(fromKey);
   const to = parseSlotKey(toKey);
   if (!isSameLocalDay(from, to)) return [toKey];

   const startMs = Math.min(from.getTime(), to.getTime());
   const endMs = Math.max(from.getTime(), to.getTime());
   const step = SLOT_MINUTES * 60_000;
   const keys: string[] = [];

   for (let t = startMs; t <= endMs; t += step) {
      keys.push(slotKey(new Date(t)));
   }
   return keys;
}

export function buildHourRange(startHour: number, endHour: number): number[] {
   const hours: number[] = [];
   for (let h = startHour; h < endHour; h++) hours.push(h);
   return hours;
}

export function buildDaySlots(
   day: Date,
   startHour: number,
   endHour: number,
): Date[] {
   const slots: Date[] = [];
   const base = new Date(day);
   base.setHours(startHour, 0, 0, 0);

   const end = new Date(day);
   end.setHours(endHour, 0, 0, 0);

   for (let t = base.getTime(); t < end.getTime(); t += SLOT_MINUTES * 60_000) {
      slots.push(new Date(t));
   }
   return slots;
}

/** Merge selected 15-minute keys into `{ start, end }` ranges (ISO strings). */
export function keysToTimeSlots(keys: Iterable<string>): TimeSlot[] {
   const sorted = [...keys]
      .map(parseSlotKey)
      .sort((a, b) => a.getTime() - b.getTime());

   if (sorted.length === 0) return [];

   const ranges: TimeSlot[] = [];
   let rangeStart = sorted[0]!;
   let rangeEnd = addMinutes(sorted[0]!, SLOT_MINUTES);

   for (let i = 1; i < sorted.length; i++) {
      const slot = sorted[i]!;
      if (slot.getTime() === rangeEnd.getTime()) {
         rangeEnd = addMinutes(slot, SLOT_MINUTES);
      } else {
         ranges.push({
            start: rangeStart.toISOString(),
            end: rangeEnd.toISOString(),
         });
         rangeStart = slot;
         rangeEnd = addMinutes(slot, SLOT_MINUTES);
      }
   }

   ranges.push({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
   });

   return ranges;
}

export function addMinutes(date: Date, minutes: number): Date {
   return new Date(date.getTime() + minutes * 60_000);
}

export function formatHourLabel(hour: number): string {
   if (hour === 0) return "12 AM";
   if (hour < 12) return `${hour} AM`;
   if (hour === 12) return "12 PM";
   return `${hour - 12} PM`;
}

/** Stable aria-label text (avoids locale-dependent SSR hydration mismatches). */
export function formatSlotAriaLabel(
   date: Date,
   hour: number,
   minutes: number,
): string {
   const y = date.getFullYear();
   const mo = String(date.getMonth() + 1).padStart(2, "0");
   const d = String(date.getDate()).padStart(2, "0");
   return `${y}-${mo}-${d} ${formatHourLabel(hour)} ${minutes} minutes`;
}

export function formatTimeRange(start: Date, end: Date): string {
   const fmt = (d: Date) =>
      d.toLocaleTimeString(undefined, {
         hour: "numeric",
         minute: "2-digit",
      });
   return `${fmt(start)} – ${fmt(end)}`;
}

export function normalizeWeekdays(daysOfWeek: Weekday[]): number[] {
   return daysOfWeek.map((day) => WEEKDAY[day]);
}

export function buildCalendarRange(config: CalendarDaysConfig): CalendarRange {
   const { weeks: weekCount, daysOfWeek, anchor } = config;
   const allowed = new Set(normalizeWeekdays(daysOfWeek));
   const start = startOfDay(anchor ?? new Date());
   const weeks: Date[][] = [];

   for (let w = 0; w < weekCount; w++) {
      const weekDays: Date[] = [];
      for (let d = 0; d < 7; d++) {
         const date = new Date(start);
         date.setDate(start.getDate() + w * 7 + d);
         if (allowed.has(date.getDay())) weekDays.push(date);
      }
      weeks.push(weekDays);
   }

   return { weeks, days: weeks.flat() };
}

function startOfDay(date: Date): Date {
   const d = new Date(date);
   d.setHours(0, 0, 0, 0);
   return d;
}
