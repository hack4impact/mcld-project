import {
   addMinutes,
   keysToTimeSlots,
   SLOT_MINUTES,
   timeSlotsToKeys,
   type TimeSlot,
} from "./time-slot";

export function intersectTimeSlots(a: TimeSlot[], b: TimeSlot[]): TimeSlot[] {
   if (a.length === 0 || b.length === 0) return [];
   const bKeys = new Set(timeSlotsToKeys(b));
   const shared = timeSlotsToKeys(a).filter((key) => bKeys.has(key));
   return keysToTimeSlots(shared);
}

export function slotIsWithin(slot: TimeSlot, slots: TimeSlot[]): boolean {
   const start = new Date(slot.start).getTime();
   const end = new Date(slot.end).getTime();
   return slots.some(
      (s) =>
         new Date(s.start).getTime() <= start &&
         new Date(s.end).getTime() >= end,
   );
}

export function expandToBookableSlots(
   windows: TimeSlot[],
   durationMinutes: number,
   stepMinutes: number = SLOT_MINUTES,
): TimeSlot[] {
   if (durationMinutes <= 0) return [];

   const durationMs = durationMinutes * 60_000;
   const stepMs = stepMinutes * 60_000;
   const slots: TimeSlot[] = [];

   for (const window of windows) {
      const windowStart = new Date(window.start).getTime();
      const windowEnd = new Date(window.end).getTime();

      for (let t = windowStart; t + durationMs <= windowEnd; t += stepMs) {
         const start = new Date(t);
         slots.push({
            start: start.toISOString(),
            end: addMinutes(start, durationMinutes).toISOString(),
         });
      }
   }

   return slots;
}

export function isBookableSlot(
   slot: TimeSlot,
   overlap: TimeSlot[],
   durationMinutes: number,
): boolean {
   const start = new Date(slot.start).toISOString();
   const end = new Date(slot.end).toISOString();
   return expandToBookableSlots(overlap, durationMinutes).some(
      (s) => s.start === start && s.end === end,
   );
}
