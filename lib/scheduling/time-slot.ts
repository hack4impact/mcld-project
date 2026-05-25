export type TimeSlot = { start: string; end: string };

export const SLOT_MINUTES = 15;

export const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;

export const SLOT_INDICES: readonly number[] = Array.from(
   { length: SLOTS_PER_HOUR },
   (_, i) => i,
);

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
   weeks: number;
   daysOfWeek: Weekday[];
   anchor: Date;
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

export function timeSlotsToKeys(slots: TimeSlot[]): string[] {
   const keys: string[] = [];
   const step = SLOT_MINUTES * 60_000;
   for (const slot of slots) {
      const start = new Date(slot.start).getTime();
      const end = new Date(slot.end).getTime();
      for (let t = start; t < end; t += step) {
         keys.push(new Date(t).toISOString());
      }
   }
   return keys;
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

export function formatSlotAriaLabel(date: Date): string {
   return date.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
   });
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
   const start = startOfDay(anchor);
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
