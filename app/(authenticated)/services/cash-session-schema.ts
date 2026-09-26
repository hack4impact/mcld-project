import { z } from "zod";
import { cadStringToCents } from "@/lib/money";

// Small tolerance for client/server clock skew on "session happened now".
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export const recordCashSessionSchema = z.object({
   submission_id: z.string().uuid("Invalid submission"),
   service_id: z.string().uuid("Invalid service"),
   user_id: z.string().uuid("Select a client"),
   child_id: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.string().uuid("Invalid child").nullable()),
   session_at: z
      .string()
      .min(1, "Session date is required")
      .transform((v) => new Date(v))
      .refine((d) => !Number.isNaN(d.getTime()), "Invalid session date")
      .refine(
         (d) => d.getTime() <= Date.now() + FUTURE_SKEW_MS,
         "Session date can't be in the future",
      ),
   duration_minutes: z.coerce
      .number()
      .int("Duration must be whole minutes")
      .positive("Duration must be positive"),
   amount: z
      .string()
      .min(1, "Amount is required")
      .transform((v) => cadStringToCents(v))
      .refine((c): c is number => c !== null && c > 0, "Enter a valid amount")
      .transform((c) => c as number),
   adjustment_reason: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null),
});

export type RecordCashSessionInput = z.infer<typeof recordCashSessionSchema>;
