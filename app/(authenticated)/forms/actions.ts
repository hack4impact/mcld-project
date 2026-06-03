"use server";

import { revalidatePath, updateTag } from "next/cache";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { extraQuestions, forms, services } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
   createFormSchema,
   updateFormSchema,
   deleteFormSchema,
} from "./schema";
import { getForm, type FormView } from "./queries";

export type FormActionState = {
   errors?: Record<string, string[]>;
   message?: string;
} | null;

const FORMS_PATH = "/forms";
const FORMS_TAG = "forms";

type QuestionInput = z.infer<typeof createFormSchema>["questions"];

function bustFormsCache() {
   updateTag(FORMS_TAG);
   revalidatePath(FORMS_PATH);
}

function field(formData: FormData, name: string): string | undefined {
   const v = formData.get(name);
   return v === null ? undefined : v.toString();
}

function parseQuestionsFromFormData(formData: FormData) {
   const raw = field(formData, "questions");
   if (!raw) {
      return {
         ok: false as const,
         errors: { questions: ["At least one question is required"] },
      };
   }

   try {
      const parsed = JSON.parse(raw);
      return { ok: true as const, value: parsed };
   } catch {
      return {
         ok: false as const,
         errors: { questions: ["Invalid questions format"] },
      };
   }
}

function parseCreatePayload(formData: FormData) {
   const questionsResult = parseQuestionsFromFormData(formData);
   if (!questionsResult.ok) return questionsResult;

   const parsed = createFormSchema.safeParse({
      name: field(formData, "name"),
      questions: questionsResult.value,
   });

   if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
   }
   return { ok: true as const, value: parsed.data };
}

function parseUpdatePayload(formData: FormData) {
   const questionsResult = parseQuestionsFromFormData(formData);
   if (!questionsResult.ok) return questionsResult;

   const parsed = updateFormSchema.safeParse({
      form_id: field(formData, "form_id"),
      name: field(formData, "name"),
      questions: questionsResult.value,
   });

   if (!parsed.success) {
      return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
   }
   return { ok: true as const, value: parsed.data };
}

type FormDb = Pick<typeof db, "insert">;

async function insertQuestions(
   formId: string,
   questions: QuestionInput,
   client: FormDb = db,
) {
   if (questions.length === 0) return;

   await client.insert(extraQuestions).values(
      questions.map((q, index) => ({
         formId,
         sortOrder: index,
         type: q.type,
         prompt: q.prompt,
         options: q.options ?? null,
      })),
   );
}

export async function loadFormForEdit(formId: string): Promise<FormView | null> {
   try {
      await requireAdmin();
   } catch {
      return null;
   }
   return getForm(formId);
}

export async function createForm(
   _prev: FormActionState,
   formData: FormData,
): Promise<FormActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = parseCreatePayload(formData);
   if (!parsed.ok) return { errors: parsed.errors };

   const { name, questions } = parsed.value;

   try {
      await db.transaction(async (tx) => {
         const [form] = await tx
            .insert(forms)
            .values({ name })
            .returning({ id: forms.id });

         if (!form) {
            throw new Error("Failed to create form");
         }

         await insertQuestions(form.id, questions, tx);
      });
   } catch {
      return { errors: { _form: ["Failed to create form. Please try again."] } };
   }

   bustFormsCache();
   return { message: "Form created." };
}

export async function updateForm(
   _prev: FormActionState,
   formData: FormData,
): Promise<FormActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = parseUpdatePayload(formData);
   if (!parsed.ok) return { errors: parsed.errors };

   const { form_id, name, questions } = parsed.value;

   const existing = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.id, form_id))
      .limit(1);

   if (!existing.length) {
      return { errors: { _form: ["Form not found"] } };
   }

   try {
      await db.transaction(async (tx) => {
         await tx
            .update(forms)
            .set({
               name,
               updatedAt: new Date(),
            })
            .where(eq(forms.id, form_id));

         await tx
            .delete(extraQuestions)
            .where(eq(extraQuestions.formId, form_id));
         await insertQuestions(form_id, questions, tx);
      });
   } catch {
      return { errors: { _form: ["Failed to update form. Please try again."] } };
   }

   bustFormsCache();
   return { message: "Form updated." };
}

export async function deleteForm(
   _prev: FormActionState,
   formData: FormData,
): Promise<FormActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const parsed = deleteFormSchema.safeParse({
      form_id: field(formData, "form_id"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { form_id } = parsed.data;

   const [serviceRow] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.formId, form_id));

   const attachedCount = serviceRow?.count ?? 0;
   if (attachedCount > 0) {
      return {
         errors: {
            _form: [
               `This form is attached to ${attachedCount} service(s). Detach it before deleting.`,
            ],
         },
      };
   }

   const deleted = await db
      .delete(forms)
      .where(eq(forms.id, form_id))
      .returning({ id: forms.id });

   if (!deleted.length) {
      return { errors: { _form: ["Form not found"] } };
   }

   bustFormsCache();
   return { message: "Form deleted." };
}