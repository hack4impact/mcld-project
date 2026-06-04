"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

import {
   createForm,
   loadFormForEdit,
   updateForm,
   type FormActionState,
} from "../actions";
import type { FormListItem } from "../queries";
import { FormQuestionsList } from "./form-questions-list";
import {
   emptyQuestion,
   type DraftQuestion,
   questionsForSubmit,
} from "./form-question-shared";
import { QuestionEditDialog } from "./question-edit-dialog";

type Props =
   | { mode: "add" }
   | {
        mode: "edit";
        form: FormListItem | null;
        open: boolean;
        onOpenChange: (open: boolean) => void;
     };

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

export function FormDialog(props: Props) {
   const isEdit = props.mode === "edit";
   const form = isEdit ? props.form : null;

   const [name, setName] = React.useState("");
   const [questions, setQuestions] = React.useState<DraftQuestion[]>([]);
   const [loading, setLoading] = React.useState(false);
   const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
   const [pendingNewQuestion, setPendingNewQuestion] =
      React.useState<DraftQuestion | null>(null);
   const [questionDialogOpen, setQuestionDialogOpen] = React.useState(false);

   const boundFormAction = React.useCallback(
      (prev: FormActionState, formData: FormData) => {
         formData.set("questions", JSON.stringify(questionsForSubmit(questions)));
         return isEdit ? updateForm(prev, formData) : createForm(prev, formData);
      },
      [isEdit, questions],
   );

   const [state, formAction, pending] = useActionState<
      FormActionState,
      FormData
   >(boundFormAction, null);

   const editOpen = isEdit ? props.open : false;

   React.useEffect(() => {
      if (!isEdit || !form?.id || !editOpen) return;

      let cancelled = false;
      setLoading(true);
      loadFormForEdit(form.id)
         .then((data) => {
            if (cancelled || !data) return;
            setName(data.name);
            setQuestions(
               data.questions.map((q) => ({
                  clientId: crypto.randomUUID(),
                  type: q.type,
                  prompt: q.prompt,
                  options: q.options ?? undefined,
               })),
            );
         })
         .finally(() => {
            if (!cancelled) setLoading(false);
         });

      return () => {
         cancelled = true;
      };
   }, [isEdit, form?.id, editOpen]);

   const closeRef = React.useRef<HTMLButtonElement>(null);
   const prevState = React.useRef<FormActionState>(null);
   React.useEffect(() => {
      if (state === prevState.current) return;
      prevState.current = state;
      if (state?.message && !state.errors) {
         if (isEdit && props.mode === "edit") {
            props.onOpenChange(false);
         } else {
            closeRef.current?.click();
            setName("");
            setQuestions([]);
         }
      }
   }, [state, isEdit, props]);

   const errors = state?.errors;

   const dialogControl = isEdit
      ? { open: props.open, onOpenChange: props.onOpenChange }
      : {};

   const showForm = !isEdit || (form !== null && !loading);

   const openQuestionEditor = (index: number) => {
      setPendingNewQuestion(null);
      setEditingIndex(index);
      setQuestionDialogOpen(true);
   };

   const handleQuestionDialogOpenChange = (open: boolean) => {
      setQuestionDialogOpen(open);
      if (!open) {
         setPendingNewQuestion(null);
         setEditingIndex(null);
      }
   };

   const addQuestion = () => {
      setEditingIndex(questions.length);
      setPendingNewQuestion(emptyQuestion());
      setQuestionDialogOpen(true);
   };

   const saveQuestion = (updated: DraftQuestion) => {
      if (pendingNewQuestion) {
         setQuestions((prev) => [...prev, updated]);
         setPendingNewQuestion(null);
      } else if (editingIndex !== null) {
         setQuestions((prev) =>
            prev.map((q, i) => (i === editingIndex ? updated : q)),
         );
      }
      setEditingIndex(null);
   };

   const deleteQuestion = () => {
      if (pendingNewQuestion) {
         setPendingNewQuestion(null);
         setEditingIndex(null);
         return;
      }
      if (editingIndex === null) return;
      setQuestions((prev) => prev.filter((_, i) => i !== editingIndex));
      setEditingIndex(null);
   };

   const editingQuestion =
      pendingNewQuestion ??
      (editingIndex !== null ? (questions[editingIndex] ?? null) : null);
   const isEditingNewQuestion = pendingNewQuestion !== null;

   return (
      <>
         <Dialog {...dialogControl}>
            {!isEdit && (
               <DialogTrigger asChild>
                  <Button className="border-primary bg-clip-border hover:border-primary/80 hover:bg-primary/80 active:translate-y-0">
                     <Plus />
                     Add form
                  </Button>
               </DialogTrigger>
            )}
            <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
               <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
                  <DialogTitle>{isEdit ? "Edit form" : "New form"}</DialogTitle>
                  <DialogDescription>
                     {isEdit
                        ? form && form.attachedServiceCount > 0
                           ? `Used by ${form.attachedServiceCount} service(s). Changes apply everywhere this form is attached.`
                           : "Update the form name and questions."
                        : "Create a reusable form for kid services."}
                  </DialogDescription>
               </DialogHeader>

               {loading && isEdit ? (
                  <div className="flex flex-1 items-center justify-center px-4 py-12">
                     <Spinner className="size-8 text-muted-foreground" />
                  </div>
               ) : showForm ? (
                  <form
                     key={form?.id ?? "new"}
                     action={formAction}
                     className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                  >
                     {form && (
                        <input type="hidden" name="form_id" value={form.id} />
                     )}

                     <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                        <div className="flex flex-col gap-1.5">
                           <Label htmlFor="name">Name</Label>
                           <Input
                              id="name"
                              name="name"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                           />
                           <FieldError messages={errors?.name} />
                        </div>

                        <div className="flex min-w-0 flex-col gap-2">
                           <div className="flex items-center justify-between gap-2">
                              <Label>Questions</Label>
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={addQuestion}
                              >
                                 <Plus className="size-4" />
                                 Add question
                              </Button>
                           </div>
                           <FormQuestionsList
                              questions={questions}
                              onChange={setQuestions}
                              onEdit={openQuestionEditor}
                           />
                           <FieldError messages={errors?.questions} />
                        </div>

                        <FieldError messages={errors?._form} />
                     </div>

                     <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 flex-row justify-end gap-2 border-t border-border bg-muted/30 px-4 py-4">
                        <DialogClose ref={closeRef} asChild>
                           <Button type="button" variant="outline">
                              Cancel
                           </Button>
                        </DialogClose>
                        <Button type="submit" disabled={pending}>
                           {pending
                              ? isEdit
                                 ? "Saving..."
                                 : "Creating..."
                              : isEdit
                                ? "Save changes"
                                : "Create form"}
                        </Button>
                     </DialogFooter>
                  </form>
               ) : null}
            </DialogContent>
         </Dialog>

         <QuestionEditDialog
            open={questionDialogOpen}
            onOpenChange={handleQuestionDialogOpenChange}
            questionIndex={editingIndex}
            question={editingQuestion}
            onSave={saveQuestion}
            onDelete={deleteQuestion}
            canDelete={isEditingNewQuestion || questions.length > 1}
         />
      </>
   );
}
