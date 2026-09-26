import { z } from "zod";

import { profileDetailsFields } from "@/app/(authenticated)/users/schema";

export const updateOwnProfileSchema = z.object({
   first_name: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(100, "First name is too long"),
   last_name: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(100, "Last name is too long"),
   ...profileDetailsFields,
});

export const changeOwnPasswordSchema = z
   .object({
      current_password: z.string().min(1, "Enter your current password"),
      new_password: z.string().min(8, "Password must be at least 8 characters"),
      confirm_password: z.string().min(1, "Please confirm the new password"),
   })
   .refine((data) => data.new_password === data.confirm_password, {
      message: "Passwords do not match",
      path: ["confirm_password"],
   })
   .refine((data) => data.new_password !== data.current_password, {
      message: "New password must be different from the current one",
      path: ["new_password"],
   });
