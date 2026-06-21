import type { FormQuestionType } from "../queries";

export type DraftOption = {
   id: string;
   title: string;
   description?: string;
};

export type DraftQuestion = {
   clientId: string;
   type: FormQuestionType;
   prompt: string;
   options?: DraftOption[];
};

export const QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
   text: "Text",
   multiple_choices: "Multiple choice",
   checkboxes: "Checkboxes",
   user_agreement: "User agreement",
};

export function emptyQuestion(): DraftQuestion {
   return {
      clientId: crypto.randomUUID(),
      type: "text",
      prompt: "",
   };
}

export function needsOptions(type: FormQuestionType): boolean {
   return type === "multiple_choices" || type === "checkboxes";
}

export function questionSummary(question: DraftQuestion): string {
   const trimmed = question.prompt.trim();
   if (trimmed) return trimmed;
   return "No prompt yet";
}

export function questionsForSubmit(questions: DraftQuestion[]) {
   return questions.map(({ type, prompt, options }) => ({
      type,
      prompt,
      options,
   }));
}

export function reorderQuestions(
   questions: DraftQuestion[],
   fromIndex: number,
   toIndex: number,
): DraftQuestion[] {
   if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= questions.length ||
      toIndex >= questions.length
   ) {
      return questions;
   }
   const next = [...questions];
   const [moved] = next.splice(fromIndex, 1);
   next.splice(toIndex, 0, moved);
   return next;
}
