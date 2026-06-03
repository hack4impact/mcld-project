"use client";

import * as React from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
   type DraftQuestion,
   QUESTION_TYPE_LABELS,
   questionSummary,
   reorderQuestions,
} from "./form-question-shared";

type FormQuestionsListProps = {
   questions: DraftQuestion[];
   onChange: (questions: DraftQuestion[]) => void;
   onEdit: (index: number) => void;
};

export function FormQuestionsList({
   questions,
   onChange,
   onEdit,
}: FormQuestionsListProps) {
   const [dragIndex, setDragIndex] = React.useState<number | null>(null);
   const [overIndex, setOverIndex] = React.useState<number | null>(null);

   const handleDrop = (toIndex: number) => {
      if (dragIndex === null) return;
      onChange(reorderQuestions(questions, dragIndex, toIndex));
      setDragIndex(null);
      setOverIndex(null);
   };

   if (questions.length === 0) {
      return (
         <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No questions yet. Add one to get started.
         </p>
      );
   }

   return (
      <ul className="flex flex-col gap-2">
         {questions.map((question, index) => (
            <li
               key={question.clientId}
               onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(index);
               }}
               onDragLeave={() => {
                  setOverIndex((prev) => (prev === index ? null : prev));
               }}
               onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
               }}
               className={cn(
                  "flex min-w-0 items-stretch overflow-hidden rounded-md border border-border bg-background transition-colors",
                  overIndex === index &&
                     dragIndex !== null &&
                     dragIndex !== index &&
                     "border-primary/50 bg-primary/5",
               )}
            >
               <button
                  type="button"
                  draggable
                  aria-label={`Reorder question ${index + 1}`}
                  onDragStart={(e) => {
                     setDragIndex(index);
                     e.dataTransfer.effectAllowed = "move";
                     e.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => {
                     setDragIndex(null);
                     setOverIndex(null);
                  }}
                  className="flex shrink-0 cursor-grab items-center border-r border-border px-2 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing"
               >
                  <GripVertical className="size-4" />
               </button>

               <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-muted/30"
               >
                  <span className="text-xs font-medium text-muted-foreground">
                     Question {index + 1} · {QUESTION_TYPE_LABELS[question.type]}
                  </span>
                  <span className="truncate text-sm">
                     {questionSummary(question)}
                  </span>
               </button>

               <div className="flex shrink-0 items-center gap-0.5 pr-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     aria-label={`Edit question ${index + 1}`}
                     onClick={() => onEdit(index)}
                  >
                     <Pencil className="size-4" />
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     aria-label={`Remove question ${index + 1}`}
                     disabled={questions.length === 1}
                     onClick={() =>
                        onChange(questions.filter((_, i) => i !== index))
                     }
                  >
                     <Trash2 className="size-4" />
                  </Button>
               </div>
            </li>
         ))}
      </ul>
   );
}
