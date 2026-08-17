import {z} from 'zod';

export const availabilitySlotSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
    durationMinutes: z.number().int().min(1).max(24 * 60),
 });