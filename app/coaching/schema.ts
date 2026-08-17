import {z} from 'zod';

export const availabilitySlotSchema = z.object({
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
    durationMinutes: z.number().int().min(1).max(24 * 60),
 });
 
 export const weeklyAvailabilitySchema = z
 .object({
    0: z.array(availabilitySlotSchema),
    1: z.array(availabilitySlotSchema),
    2: z.array(availabilitySlotSchema),
    3: z.array(availabilitySlotSchema),
    4: z.array(availabilitySlotSchema),
    5: z.array(availabilitySlotSchema),
    6: z.array(availabilitySlotSchema),
 })
 .refine((week) => !Object.values(week).some(daySlotsOverlap), {
    message: "Slots on the same day must not overlap",
 });

 
 export const updateCoordinatorAvailabilitySchema = z.object({
    coordinatorId: z.string().uuid(),
    slots: weeklyAvailabilitySchema,
 });

 function daySlotsOverlap(
    slots: z.infer<typeof availabilitySlotSchema>[],
 ): boolean {
    const ranges = slots
       .map((slot) => {
          const [hours, minutes] = slot.time.split(":").map(Number);
          const start = hours * 60 + minutes;
          return { start, end: start + slot.durationMinutes };
       })
       .sort((a, b) => a.start - b.start);
 
    for (let i = 1; i < ranges.length; i++) {
       if (ranges[i]!.start < ranges[i - 1]!.end) return true;
    }
    return false;
 }