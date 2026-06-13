"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionView } from "@/app/(authenticated)/forms/queries";

export type FormAnswersState = Record<string, string[]>;

type CheckoutFormFieldsProps = {
   questions: QuestionView[];
   answers: FormAnswersState;
   onChange: (answers: FormAnswersState) => void;
};

function setAnswer(
   answers: FormAnswersState,
   questionId: string,
   value: string[],
   onChange: (answers: FormAnswersState) => void,
) {
   onChange({ ...answers, [questionId]: value });
}

export function CheckoutFormFields({
   questions,
   answers,
   onChange,
}: CheckoutFormFieldsProps) {
   return (
      <div className="space-y-6">
         {questions.map((question) => (
            <div key={question.id} className="space-y-2">
               <Label className="text-sm font-medium leading-snug">
                  {question.prompt}
               </Label>

               {question.type === "text" && (
                  <Textarea
                     value={answers[question.id]?.[0] ?? ""}
                     onChange={(e) =>
                        setAnswer(
                           answers,
                           question.id,
                           [e.target.value],
                           onChange,
                        )
                     }
                     rows={3}
                     className="resize-none"
                  />
               )}

               {question.type === "multiple_choices" && (
                  <Select
                     value={answers[question.id]?.[0] ?? ""}
                     onValueChange={(value) =>
                        setAnswer(answers, question.id, [value], onChange)
                     }
                  >
                     <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an option" />
                     </SelectTrigger>
                     <SelectContent>
                        {(question.options ?? []).map((option) => (
                           <SelectItem key={option.id} value={option.id}>
                              {option.title}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               )}

               {question.type === "checkboxes" && (
                  <div className="space-y-2">
                     {(question.options ?? []).map((option) => {
                        const selected = answers[question.id] ?? [];
                        const checked = selected.includes(option.id);
                        return (
                           <div
                              key={option.id}
                              className="flex items-start gap-2"
                           >
                              <Checkbox
                                 id={`${question.id}-${option.id}`}
                                 checked={checked}
                                 onCheckedChange={(isChecked) => {
                                    const next = isChecked
                                       ? [...selected, option.id]
                                       : selected.filter(
                                            (id) => id !== option.id,
                                         );
                                    setAnswer(
                                       answers,
                                       question.id,
                                       next,
                                       onChange,
                                    );
                                 }}
                              />
                              <Label
                                 htmlFor={`${question.id}-${option.id}`}
                                 className="font-normal leading-snug"
                              >
                                 {option.title}
                              </Label>
                           </div>
                        );
                     })}
                  </div>
               )}

               {question.type === "user_agreement" && (
                  <div className="flex items-start gap-2">
                     <Checkbox
                        id={question.id}
                        checked={answers[question.id]?.[0] === "true"}
                        onCheckedChange={(isChecked) =>
                           setAnswer(
                              answers,
                              question.id,
                              isChecked ? ["true"] : [],
                              onChange,
                           )
                        }
                     />
                     <Label
                        htmlFor={question.id}
                        className="font-normal leading-snug"
                     >
                        I agree
                     </Label>
                  </div>
               )}
            </div>
         ))}
      </div>
   );
}

export function validateFormAnswersClient(
   questions: QuestionView[],
   answers: FormAnswersState,
): string | null {
   for (const question of questions) {
      const value = answers[question.id];
      if (!value?.length) {
         return `Please answer: ${question.prompt}`;
      }

      if (question.type === "text" && !value[0]?.trim()) {
         return `Please answer: ${question.prompt}`;
      }

      if (question.type === "multiple_choices") {
         const valid = (question.options ?? []).some((o) => o.id === value[0]);
         if (!valid) return `Please select an option for: ${question.prompt}`;
      }

      if (question.type === "checkboxes") {
         const optionIds = new Set(
            (question.options ?? []).map((o) => o.id),
         );
         if (!value.some((id) => optionIds.has(id))) {
            return `Select at least one option for: ${question.prompt}`;
         }
      }

      if (question.type === "user_agreement" && value[0] !== "true") {
         return `You must agree to: ${question.prompt}`;
      }
   }

   return null;
}

export function formAnswersToInput(
   questions: QuestionView[],
   answers: FormAnswersState,
): { questionId: string; answer: string[] }[] {
   return questions.map((q) => ({
      questionId: q.id,
      answer:
         q.type === "text"
            ? [answers[q.id]?.[0]?.trim() ?? ""]
            : (answers[q.id] ?? []),
   }));
}