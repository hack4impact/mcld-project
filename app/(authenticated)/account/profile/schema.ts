import { z } from "zod";
import { genderEnum } from "@/lib/db/schema";

const optionalText = (max: number) =>
   z
      .string()
      .max(max)
      .transform((value) => {
         const trimmed = value.trim();
         return trimmed === "" ? null : trimmed;
      });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const updateProfileSchema = z.object({
   first_name: z.string().trim().min(1, "First name is required").max(80),
   last_name: z.string().trim().min(1, "Last name is required").max(80),
   phone: optionalText(40),
   address: optionalText(200),
   dob: optionalText(10).refine(
      (value) =>
         value === null ||
         (DATE_RE.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            Date.parse(value) <= Date.now()),
      "Enter a valid date of birth in the past",
   ),
   gender: z
      .string()
      .transform((value) => (value.trim() === "" ? null : value.trim()))
      .refine(
         (value) =>
            value === null ||
            (genderEnum.enumValues as readonly string[]).includes(value),
         "Select a valid option",
      ),
});
