import { z } from "zod";
import { cadStringToCents } from "@/lib/money";

const FUTURE_SKEW_MS = 5 * 60 * 1000;

function pastDate(label: string) {
   return z
      .string()
      .min(1, `${label} is required`)
      .datetime({ offset: true, message: `Invalid ${label.toLowerCase()}` })
      .transform((value) => new Date(value))
      .refine(
         (date) => date.getTime() <= Date.now() + FUTURE_SKEW_MS,
         `${label} can't be in the future`,
      );
}

export const recordCashSessionSchema = z.object({
   submission_id: z.string().uuid("Invalid submission"),
   submitted_at: pastDate("Submission date"),
   service_id: z.string().uuid("Invalid service"),
   user_id: z.string().uuid("Select a client"),
   child_id: z
      .string()
      .optional()
      .transform((value) => value || null)
      .pipe(z.string().uuid("Invalid child").nullable()),
   session_at: pastDate("Session date"),
   collected_at: pastDate("Cash collection date"),
   duration_minutes: z.coerce
      .number()
      .int("Duration must be whole minutes")
      .positive("Duration must be positive")
      .max(1440, "Duration must not exceed 24 hours"),
   amount: z
      .string()
      .trim()
      .regex(
         /^\d+(?:[.,]\d{1,2})?$/,
         "Enter a valid amount with at most two decimal places",
      )
      .transform((value) => cadStringToCents(value))
      .refine(
         (value): value is number =>
            value !== null &&
            Number.isSafeInteger(value) &&
            value > 0 &&
            value <= 99999999,
         "Enter a valid amount",
      )
      .transform((value) => value as number),
   adjustment_reason: z
      .string()
      .max(500, "Reason must not exceed 500 characters")
      .optional()
      .transform((value) => value?.trim() || null),
});

export type RecordCashSessionInput = z.infer<typeof recordCashSessionSchema>;
