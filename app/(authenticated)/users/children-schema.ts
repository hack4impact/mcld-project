import { z } from "zod";

const genderSchema = z.enum(["male", "female", "prefer_not_to_say"]);

function isValidPastOrTodayDate(iso: string): boolean {
   if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
   const [y, m, d] = iso.split("-").map(Number);
   if (!y || !m || !d) return false;
   const date = new Date(y, m - 1, d);
   if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
   ) {
      return false;
   }
   const today = new Date();
   today.setHours(23, 59, 59, 999);
   return date <= today;
}

export const emergencyContactSchema = z.object({
   full_name: z.string().min(1, "Full name is required"),
   email_address: z.string().email("Invalid email address"),
   phone_number: z
      .string()
      .regex(/^\d{10,15}$/, "Phone number must be 10–15 digits"),
   relationship: z.string().min(1, "Relationship is required"),
});

const dobSchema = z
   .string()
   .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date of birth")
   .refine(isValidPastOrTodayDate, {
      message: "Date of birth must be a real date that is not in the future",
   });

export const createChildSchema = z.object({
   first_name: z.string().min(1, "First name is required"),
   last_name: z.string().min(1, "Last name is required"),
   dob: dobSchema,
   gender: genderSchema,
   allergies: z.string().optional(),
   medical_conditions: z.string().optional(),
   medications: z.string().optional(),
   emergency_contacts: z
      .array(emergencyContactSchema)
      .min(1, "At least one emergency contact is required"),
});

export const updateChildSchema = createChildSchema.extend({
   child_id: z.string().uuid(),
});

export const deleteChildSchema = z.object({
   child_id: z.string().uuid(),
});

export const createChildAdminSchema = createChildSchema.extend({
   parent_id: z.string().uuid(),
});

export const updateChildAdminSchema = updateChildSchema.extend({
   parent_id: z.string().uuid(),
});

export type ChildActionState = {
   errors?: Record<string, string[]>;
   message?: string;
   data?: { childId: string };
} | null;
