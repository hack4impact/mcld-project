import {z } from "zod"; 

const genderSchema = z.enum(["male", "female", "prefer_not_to_say"]);
const emergencyContactSchema = z.object({
    full_name: z.string().min(1, "Full name is required"), 
    email_address: z.string().email("Invalid email address"),
    phone_number: z.string().min(1, "Phone number is required"),
    relationship: z.string().min(1, "Relationship is required"),
});

export const createChildSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date of birth"),
    gender: genderSchema,
    allergies: z.string().optional(),
    medical_conditions: z.string().optional(),
    medications: z.string().optional(),
    emergency_contacts: z.array(emergencyContactSchema).min(1, "At least one emergency contact is required"),

})

export const updateChildSchema = createChildSchema.extend({
    child_id: z.string().uuid(),
})