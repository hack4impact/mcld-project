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