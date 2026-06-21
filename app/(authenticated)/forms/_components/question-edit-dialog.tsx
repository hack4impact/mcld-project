"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
   type DraftOption,
   type DraftQuestion,
   needsOptions,
   QUESTION_TYPE_LABELS,
} from "./form-question-shared";
import type { FormQuestionType } from "../queries";

function FieldError({ messages }: { messages?: string[] }) {
   if (!messages?.length) return null;
   return (
      <ul className="flex flex-col gap-0.5 text-xs text-destructive">
         {messages.map((m, i) => (
            <li key={i}>{m}</li>
         ))}
      </ul>
   );
}

type QuestionEditDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   questionIndex: number | null;
   question: DraftQuestion | null;
   onSave: (question: DraftQuestion) => void;
   onDelete?: () => void;
   canDelete?: boolean;
};

function OptionEditor({
   option,
   optionIndex,
   canRemove,
   onChange,
   onRemove,
}: {
   option: DraftOption;
   optionIndex: number;
   canRemove: boolean;
   onChange: (patch: Partial<DraftOption>) => void;
   onRemove: () => void;
}) {
   return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
         <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
               Option {optionIndex + 1}
            </span>
            <Button
               type="button"
               variant="ghost"
               size="icon-sm"
               aria-label={`Remove option ${optionIndex + 1}`}
               disabled={!canRemove}
               onClick={onRemove}
            >
               <X className="size-4" />
            </Button>
         </div>
         <div className="flex flex-col gap-2">
            <Input
               placeholder="Option title"
               value={option.title}
               onChange={(e) => onChange({ title: e.target.value })}
            />
            <Input
               placeholder="Description (optional)"
               value={option.description ?? ""}
               onChange={(e) =>
                  onChange({
                     description: e.target.value || undefined,
                  })
               }
            />
         </div>
      </div>
   );
}

export function QuestionEditDialog({
   open,
   onOpenChange,
   questionIndex,
   question,
   onSave,
   onDelete,
   canDelete = false,
}: QuestionEditDialogProps) {
   const [draft, setDraft] = React.useState<DraftQuestion | null>(null);
   const [errors, setErrors] = React.useState<Record<string, string[]>>({});

   React.useEffect(() => {
      if (open && question) {
         setDraft({
            ...question,
            options: question.options?.map((o) => ({ ...o })),
         });
         setErrors({});
      }
   }, [open, question]);

   if (!draft) return null;

   const showOptions = needsOptions(draft.type);

   const updateOption = (optionIndex: number, patch: Partial<DraftOption>) => {
      setDraft((prev) => {
         if (!prev) return prev;
         return {
            ...prev,
            options: (prev.options ?? []).map((o, i) =>
               i === optionIndex ? { ...o, ...patch } : o,
            ),
         };
      });
   };

   const addOption = () => {
      setDraft((prev) => {
         if (!prev) return prev;
         return {
            ...prev,
            options: [
               ...(prev.options ?? []),
               { id: crypto.randomUUID(), title: "" },
            ],
         };
      });
   };

   const removeOption = (optionIndex: number) => {
      setDraft((prev) => {
         if (!prev) return prev;
         return {
            ...prev,
            options: (prev.options ?? []).filter((_, i) => i !== optionIndex),
         };
      });
   };

   const validate = (): boolean => {
      const nextErrors: Record<string, string[]> = {};
      if (!draft.prompt.trim()) {
         nextErrors.prompt = ["Prompt is required"];
      }
      if (needsOptions(draft.type)) {
         const options = draft.options ?? [];
         if (options.length === 0) {
            nextErrors.options = ["At least one option is required"];
         } else if (options.some((o) => !o.title.trim())) {
            nextErrors.options = ["Each option needs a title"];
         }
      }
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
   };

   const handleSave = () => {
      if (!validate()) return;
      onSave(draft);
      onOpenChange(false);
   };

   const title =
      questionIndex !== null
         ? `Question ${questionIndex + 1}`
         : "New question";

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
            <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
               <DialogTitle>{title}</DialogTitle>
               <DialogDescription>
                  Configure the question type, prompt, and options.
               </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
               <div className="flex flex-col gap-1.5">
                  <Label>Type</Label>
                  <Select
                     value={draft.type}
                     onValueChange={(v) => {
                        const type = v as FormQuestionType;
                        setDraft((prev) => {
                           if (!prev) return prev;
                           return {
                              ...prev,
                              type,
                              options: needsOptions(type)
                                 ? prev.options?.length
                                    ? prev.options
                                    : [{ id: crypto.randomUUID(), title: "" }]
                                 : undefined,
                           };
                        });
                     }}
                  >
                     <SelectTrigger className="w-full">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {(
                           Object.keys(QUESTION_TYPE_LABELS) as FormQuestionType[]
                        ).map((t) => (
                           <SelectItem key={t} value={t}>
                              {QUESTION_TYPE_LABELS[t]}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Prompt</Label>
                  <Textarea
                     value={draft.prompt}
                     onChange={(e) =>
                        setDraft((prev) =>
                           prev ? { ...prev, prompt: e.target.value } : prev,
                        )
                     }
                     rows={3}
                     className="max-h-40 resize-y"
                  />
                  <FieldError messages={errors.prompt} />
               </div>

               {showOptions && (
                  <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between gap-2">
                        <Label className="mb-0">Options</Label>
                        <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={addOption}
                        >
                           <Plus className="size-4" />
                           Add option
                        </Button>
                     </div>
                     <div className="flex flex-col gap-2">
                        {(draft.options ?? []).map((option, optionIndex) => (
                           <OptionEditor
                              key={option.id}
                              option={option}
                              optionIndex={optionIndex}
                              canRemove={(draft.options?.length ?? 0) > 1}
                              onChange={(patch) =>
                                 updateOption(optionIndex, patch)
                              }
                              onRemove={() => removeOption(optionIndex)}
                           />
                        ))}
                     </div>
                     <FieldError messages={errors.options} />
                  </div>
               )}
            </div>

            <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 flex-row items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-4">
               {canDelete && onDelete ? (
                  <Button
                     type="button"
                     variant="destructive"
                     onClick={() => {
                        onDelete();
                        onOpenChange(false);
                     }}
                  >
                     Delete question
                  </Button>
               ) : (
                  <span />
               )}
               <div className="flex shrink-0 gap-2">
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                  >
                     Cancel
                  </Button>
                  <Button type="button" onClick={handleSave}>
                     Save question
                  </Button>
               </div>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
