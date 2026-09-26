import { z } from "zod";

import { passwordSchema } from "@/lib/auth/password";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  // No length rule here: accounts made under the old 6-character minimum must
  // still be able to log in.
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
});

export const resendSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});
