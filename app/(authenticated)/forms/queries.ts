import { ExtraQuestionOption, extraQuestions, forms, services} from "@/lib/db/schema";
import { cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { asc,desc, eq ,count} from "drizzle-orm";

export type ExtraQuestionType = "text" | "multiple_choices" | "checkboxes" | "user_agreement";

export type QuestionView = {
    id: string;
    sortOrder: number;
    type: ExtraQuestionType;
    prompt: string;
    options: ExtraQuestionOption[] | null;
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

    const rows =  await db
        .select()
        .from(forms)
        .orderBy(desc(forms.createdAt));

    return Promise.all(
        rows.map(async (row) => {
            const [questionRow] = await db
                .select({ count: count() })
                .from(extraQuestions)
                .where(eq(extraQuestions.formId, row.id));

            const [serviceRow] = await db
                .select({ count: count() })
                .from(services)
                .where(eq(services.formId, row.id));
            
            return {
                id: row.id,
                name: row.name,
                questionCount: questionRow?.count ?? 0,
                attachedServiceCount: serviceRow?.count ?? 0,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            }
        })
    )
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
        id: extraQuestions.id,
        sortOrder: extraQuestions.sortOrder,
        type: extraQuestions.type,
        prompt: extraQuestions.prompt,
        options: extraQuestions.options,
      })
      .from(extraQuestions)
      .where(eq(extraQuestions.formId, id))
      .orderBy(asc(extraQuestions.sortOrder));
  
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