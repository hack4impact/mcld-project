import {z} from "zod";
import { ROLES } from "@/lib/roles";
import { dobSchema, genderSchema } from "./children-schema";

function blankToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

const profileDetailsFields = {
  address: z.preprocess(
    blankToNull,
    z.string().max(500, "Address is too long").nullable(),
  ),
  gender: z.preprocess(blankToNull, genderSchema.nullable()),
  dob: z.preprocess(blankToNull, dobSchema.nullable()),
  phone: z.preprocess(
    (value) => blankToNull(value)?.replace(/(?!^\+)[\s().+-]/g, "") ?? null,
    z
      .string()
      .regex(/^\+?\d{10,15}$/, "Phone number must be 10–15 digits")
      .nullable(),
  ),
};

export const createUserAdminSchema = z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
    subscription_months: z.coerce.number().int().min(0).max(24).default(0),
    ...profileDetailsFields,
});

export const updateUserAdminSchema = z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
    address: profileDetailsFields.address.optional(),
    gender: profileDetailsFields.gender.optional(),
    dob: profileDetailsFields.dob.optional(),
    phone: profileDetailsFields.phone.optional(),
})

export const getTransactionsSchema = z.object({
  customerId: z.string().min(1,"Customer ID is required"),
  limit: z.number().min(1).max(100).optional().default(10),
  startingAfter: z.string().optional(),
});

export const createRefundSchema = z.object({
  chargeId: z.string().min(1, "Charge ID is required"),
  amountCents: z.coerce.number().int().positive().optional(),
  idempotencyKey: z.string().min(1,"Idempotency key is required"),
  customerId: z.string().min(1, "Customer ID is required")
})
