export type TimeSlot = { start: string; end: string };

export const SLOT_MINUTES = 15;
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 19;

export function slotKey(date: Date): string {
   return date.toISOString();
}

export function parseSlotKey(key: string): Date {
   return new Date(key);
}

export function buildDaySlots(day: Date): Date[] {
   const slots: Date[] = [];
   const base = new Date(day);
   base.setHours(DAY_START_HOUR, 0, 0, 0);

   const end = new Date(day);
   end.setHours(DAY_END_HOUR, 0, 0, 0);

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

export function formatTimeRange(start: Date, end: Date): string {
   const fmt = (d: Date) =>
      d.toLocaleTimeString(undefined, {
         hour: "numeric",
         minute: "2-digit",
      });
   return `${fmt(start)} – ${fmt(end)}`;
}

export function getTwoWeekRange(anchor = new Date()): {
   days: Date[];
   week1: Date[];
   week2: Date[];
   label: string;
} {
   const start = startOfWeekMonday(anchor);
   const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
   });

   const week1 = days.slice(0, 7);
   const week2 = days.slice(7, 14);
   const year = week2[6]!.getFullYear();
   const label = `${formatRangeDate(week1[0]!)} – ${formatRangeDate(week2[6]!, false)}, ${year}`;

   return { days, week1, week2, label };
}

function startOfWeekMonday(date: Date): Date {
   const d = new Date(date);
   d.setHours(0, 0, 0, 0);
   const day = d.getDay();
   const diff = day === 0 ? -6 : 1 - day;
   d.setDate(d.getDate() + diff);
   return d;
}

function formatRangeDate(date: Date, monthOnly = true): string {
   if (monthOnly) {
      return date
         .toLocaleDateString(undefined, { month: "short", day: "numeric" })
         .toUpperCase();
   }
   return String(date.getDate());
}
