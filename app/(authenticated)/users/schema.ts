import {z} from "zod";
import { ROLES } from "@/lib/roles";

export const createUserAdminSchema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm the password"),
    email: z.string().email(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
    subscription_months: z.coerce.number().int().min(0).max(24).default(0),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const updateUserAdminSchema = z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
})

export const getTransactionsSchema = z.object({
  customerId: z.string().min(1,"Customer ID is required"),
  limit: z.number().min(1).max(100).optional().default(10),
  startingAfter: z.string().optional(),
});

export const createRefundSchema = z.object({
  chargeId: z.string().min(1, "Charge ID is required"),
  amountCents: z.coerce.number().int().positive().optional(),
  idempotencyKey: z.string().min(1,"Idempotency key is required")
})
