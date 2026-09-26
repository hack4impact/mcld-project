import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
   .string()
   .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
   );

export const newPasswordSchema = z
   .object({
      password: passwordSchema,
      confirm_password: z.string().min(1, "Please confirm the password"),
   })
   .refine((data) => data.password === data.confirm_password, {
      message: "Passwords do not match",
      path: ["confirm_password"],
   });

export type NewPasswordErrors = {
   password?: string[];
   confirm_password?: string[];
   _form?: string[];
};

export function passwordUpdateErrors(error: {
   code?: string;
   message: string;
}): NewPasswordErrors {
   if (error.code === "same_password") {
      return {
         password: ["Choose a different password from your current one."],
      };
   }
   if (error.code === "weak_password") {
      return { password: [error.message] };
   }
   return { _form: ["We couldn't update your password. Please try again."] };
}
