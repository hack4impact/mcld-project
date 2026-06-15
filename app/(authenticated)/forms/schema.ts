import { z } from "zod";

const extraQuestionTypeSchema = z.enum([
  "text",
  "multiple_choices",
  "checkboxes",
  "user_agreement",
]);

const optionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const questionSchema = z
  .object({
    type: extraQuestionTypeSchema,
    prompt: z.string().min(1, "Prompt is required"),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((q, ctx) => {
    const needsOptions =
      q.type === "multiple_choices" || q.type === "checkboxes";
    if (needsOptions && (!q.options || q.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one option is required",
        path: ["options"],
      });
    }
  });

export const createFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

export const updateFormSchema = createFormSchema.extend({
  form_id: z.string().uuid(),
});

export const deleteFormSchema = z.object({
  form_id: z.string().uuid(),
});