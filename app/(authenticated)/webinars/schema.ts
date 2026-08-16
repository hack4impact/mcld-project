import { z } from "zod";

export const webinarTierSchema = z.enum(["free", "premium"]);

const youtubeUrlSchema = z
   .string()
   .url("Enter a valid YouTube URL")
   .refine(
      (value) => {
         try {
            const hostname = new URL(value).hostname.toLowerCase();
            return [
               "youtube.com",
               "www.youtube.com",
               "youtu.be",
               "www.youtu.be",
            ].includes(hostname);
         } catch {
            return false;
         }
      },
      { message: "URL must be a YouTube URL" },
   );

const durationSchema = z.coerce
   .number()
   .int("Duration must be a whole number")
   .min(1, "Duration must be at least 1 minute")
   .max(24 * 60, "Duration cannot exceed 24 hours");

export const createWebinarSchema = z.object({
   title: z.string().trim().min(1, "Title is required").max(500),
   description: z.string().trim().max(5000).optional(),
   tier: webinarTierSchema,
   duration_minutes: durationSchema,
   youtube_url: youtubeUrlSchema.optional(),
   is_active: z.enum(["true", "false"]).optional(),
});

export const updateWebinarSchema = z.object({
   webinar_id: z.string().uuid("Invalid webinar"),
   title: z.string().trim().min(1, "Title cannot be empty").max(500).optional(),
   description: z.string().trim().max(5000).optional(),
   tier: webinarTierSchema.optional(),
   duration_minutes: durationSchema.optional(),
   youtube_url: z.union([youtubeUrlSchema, z.literal("")]).optional(),
   is_active: z.enum(["true", "false"]).optional(),
});

export const deleteWebinarSchema = z.object({
   webinar_id: z.string().uuid("Invalid webinar"),
});
