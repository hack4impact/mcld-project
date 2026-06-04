"use client";

import * as React from "react";
import {
   closestCenter,
   DndContext,
   KeyboardSensor,
   PointerSensor,
   useSensor,
   useSensors,
   type DragEndEvent,
} from "@dnd-kit/core";
import {
   SortableContext,
   sortableKeyboardCoordinates,
   useSortable,
   verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
   type DraftQuestion,
   QUESTION_TYPE_LABELS,
   questionSummary,
} from "./form-question-shared";

type FormQuestionsListProps = {
   questions: DraftQuestion[];
   onChange: (questions: DraftQuestion[]) => void;
   onEdit: (index: number) => void;
};

const embeddedButtonClassName =
   "rounded-none border-0 shadow-none focus-visible:border-0 focus-visible:ring-0 active:translate-y-0";

type SortableQuestionItemProps = {
   question: DraftQuestion;
   index: number;
   canRemove: boolean;
   onEdit: (index: number) => void;
   onRemove: (index: number) => void;
};

function SortableQuestionItem({
   question,
   index,
   canRemove,
   onEdit,
   onRemove,
}: SortableQuestionItemProps) {
   const {
      attributes,
      listeners,
      setNodeRef,
      setActivatorNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
   } = useSortable({ id: question.clientId });

   return (
      <li
         ref={setNodeRef}
         style={{
            transform: CSS.Transform.toString(transform),
            transition,
         }}
         className={cn(
            "flex min-w-0 items-stretch overflow-hidden rounded-md border border-border bg-background transition-colors",
            isDragging && "z-10 opacity-50",
            isOver && !isDragging && "border-primary/50 bg-primary/5",
         )}
      >
         <Button
            asChild
            variant="ghost"
            className={cn(
               embeddedButtonClassName,
               "flex h-auto min-h-0 shrink-0 cursor-grab self-stretch px-2 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing",
            )}
         >
            <button
               ref={setActivatorNodeRef}
               type="button"
               aria-label={`Reorder question ${index + 1}`}
               {...attributes}
               {...listeners}
            >
               <GripVertical className="size-4" />
            </button>
         </Button>

         <div
            role="presentation"
            className="w-px shrink-0 self-stretch bg-border"
         />

         <Button
            type="button"
            variant="ghost"
            onClick={() => onEdit(index)}
            className={cn(
               embeddedButtonClassName,
               "flex h-auto min-h-0 min-w-0 flex-1 flex-col items-start justify-start gap-0.5 px-3 py-2.5 text-left font-normal whitespace-normal hover:bg-muted/30",
            )}
         >
            <span className="text-xs font-medium text-muted-foreground">
               Question {index + 1} · {QUESTION_TYPE_LABELS[question.type]}
            </span>
            <span className="truncate text-sm">
               {questionSummary(question)}
            </span>
         </Button>

         <div className="flex shrink-0 items-center gap-0.5 pr-1">
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               aria-label={`Edit question ${index + 1}`}
               onClick={() => onEdit(index)}
               className={embeddedButtonClassName}
            >
               <Pencil className="size-4" />
            </Button>
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               aria-label={`Remove question ${index + 1}`}
               disabled={!canRemove}
               onClick={() => onRemove(index)}
               className={embeddedButtonClassName}
            >
               <Trash2 className="size-4" />
            </Button>
         </div>
      </li>
   );
}

export function FormQuestionsList({
   questions,
   onChange,
   onEdit,
}: FormQuestionsListProps) {
   const itemIds = React.useMemo(
      () => questions.map((question) => question.clientId),
      [questions],
   );

   const sensors = useSensors(
      useSensor(PointerSensor, {
         activationConstraint: { distance: 8 },
      }),
      useSensor(KeyboardSensor, {
         coordinateGetter: sortableKeyboardCoordinates,
      }),
   );

   const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = questions.findIndex(
         (question) => question.clientId === active.id,
      );
      const toIndex = questions.findIndex(
         (question) => question.clientId === over.id,
      );
      if (fromIndex === -1 || toIndex === -1) return;

      const next = [...questions];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onChange(next);
   };

   if (questions.length === 0) {
      return (
         <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No questions yet. Add one to get started.
         </p>
      );
   }

   return (
      <DndContext
         sensors={sensors}
         collisionDetection={closestCenter}
         onDragEnd={handleDragEnd}
      >
         <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
               {questions.map((question, index) => (
                  <SortableQuestionItem
                     key={question.clientId}
                     question={question}
                     index={index}
                     canRemove={questions.length > 1}
                     onEdit={onEdit}
                     onRemove={(removeIndex) =>
                        onChange(
                           questions.filter((_, i) => i !== removeIndex),
                        )
                     }
                  />
               ))}
            </ul>
         </SortableContext>
      </DndContext>
   );
}
