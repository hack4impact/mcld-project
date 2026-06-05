import { z } from "zod";

export const serviceTypeSchema = z.enum(["programs", "private_lessons"]);

export const serviceFormSchema = z
   .object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      priceDollars: z.coerce.number().positive("Price must be greater than zero"),
      durationMinutes: z.coerce
         .number()
         .int()
         .positive("Duration must be at least 1 minute"),
      type: serviceTypeSchema,
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      coachId: z.string().optional(),
   })
   .superRefine((data, ctx) => {
      if (data.type === "programs") {
         if (!data.startDate) {
            ctx.addIssue({
               code: z.ZodIssueCode.custom,
               message: "Start date is required for programs",
               path: ["startDate"],
            });
         }
         if (!data.endDate) {
            ctx.addIssue({
               code: z.ZodIssueCode.custom,
               message: "End date is required for programs",
               path: ["endDate"],
            });
         }
      }
   });

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function parseServiceForm(formData: FormData) {
   return serviceFormSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      priceDollars: formData.get("priceDollars"),
      durationMinutes: formData.get("durationMinutes"),
      type: formData.get("type"),
      startDate: formData.get("startDate") || undefined,
      endDate: formData.get("endDate") || undefined,
      coachId: formData.get("coachId") || undefined,
   });
}

export function dollarsToCents(dollars: number) {
   return Math.round(dollars * 100);
}
