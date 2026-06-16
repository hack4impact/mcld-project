import {
   FormQuestionOption,
   formQuestions,
   forms,
   services,
} from "@/lib/db/schema";
import { cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { asc, count, desc, eq, sql } from "drizzle-orm";

export type FormQuestionType = "text" | "multiple_choices" | "checkboxes" | "user_agreement";

export type QuestionView = {
    id: string;
    sortOrder: number;
    type: FormQuestionType;
    prompt: string;
    options: FormQuestionOption[] | null;
}

export type FormListItem = {
    id: string;
    name: string;
    questionCount: number;
    attachedServiceCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export type FormView = FormListItem & {
    questions: QuestionView[];
  };

const FORMS_TAG = "forms";
export async function listForms(): Promise<FormListItem[]> {
   "use cache";
   cacheTag(FORMS_TAG);

   const rows = await db
      .select({
         id: forms.id,
         name: forms.name,
         createdAt: forms.createdAt,
         updatedAt: forms.updatedAt,
         questionCount: sql<number>`cast(count(distinct ${formQuestions.id}) as integer)`,
         attachedServiceCount: sql<number>`cast(count(distinct ${services.id}) as integer)`,
      })
      .from(forms)
      .leftJoin(formQuestions, eq(formQuestions.formId, forms.id))
      .leftJoin(services, eq(services.formId, forms.id))
      .groupBy(forms.id, forms.name, forms.createdAt, forms.updatedAt)
      .orderBy(desc(forms.createdAt));

   return rows.map((row) => ({
      id: row.id,
      name: row.name,
      questionCount: Number(row.questionCount),
      attachedServiceCount: Number(row.attachedServiceCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
   }));
}


export async function getForm(id: string): Promise<FormView | null> {
    "use cache";
    cacheTag(FORMS_TAG);
  
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1);
  
    if (!form) return null;
  
    const questionRows = await db
      .select({
        id: formQuestions.id,
        sortOrder: formQuestions.sortOrder,
        type: formQuestions.type,
        prompt: formQuestions.prompt,
        options: formQuestions.options,
      })
      .from(formQuestions)
      .where(eq(formQuestions.formId, id))
      .orderBy(asc(formQuestions.sortOrder));
  
    const [serviceRow] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.formId, id));
  
    return {
      id: form.id,
      name: form.name,
      questionCount: questionRows.length,
      attachedServiceCount: serviceRow?.count ?? 0,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      questions: questionRows.map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
      })),
    };
  }