"use client";

import * as React from "react";
import { useActionState } from "react";
import { format } from "date-fns";
import { CalendarIcon, DollarSign, Plus, X } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import type { FormListItem } from "@/app/(authenticated)/forms/queries";
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
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centsToMoneyString } from "@/lib/money";

import {
   createService,
   updateService,
   type ProgramSchedule,
   type ProgramSlot,
   type ServiceActionState,
} from "@/app/(authenticated)/services/actions";
import type {
   CoachOption,
   ServiceView,
} from "@/app/(authenticated)/services/queries";

type Props = { coaches: CoachOption[]; forms: FormListItem[] } & (
   | { mode: "add" }
   | { mode: "edit"; service: ServiceView | null; open: boolean; onOpenChange: (open: boolean) => void }
);

const DAY_NAMES = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
] as const;

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

function toISODate(date: Date): string {
   const y = date.getFullYear();
   const m = String(date.getMonth() + 1).padStart(2, "0");
   const d = String(date.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

function fromISODate(value: string | undefined): Date | undefined {
   if (!value) return undefined;
   const [y, m, d] = value.split("-").map(Number);
   if (!y || !m || !d) return undefined;
   return new Date(y, m - 1, d);
}

function DateRangePicker({
   value,
   onChange,
}: {
   value: DateRange | undefined;
   onChange: (v: DateRange | undefined) => void;
}) {
   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button
               type="button"
               variant="outline"
               className="justify-start px-2.5 font-normal"
            >
               <CalendarIcon className="size-4" />
               {value?.from ? (
                  value.to ? (
                     <>
                        {format(value.from, "LLL dd, y")} -{" "}
                        {format(value.to, "LLL dd, y")}
                     </>
                  ) : (
                     format(value.from, "LLL dd, y")
                  )
               ) : (
                  <span>Pick a date range</span>
               )}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
            <Calendar
               mode="range"
               defaultMonth={value?.from}
               selected={value}
               onSelect={onChange}
               numberOfMonths={2}
               showOutsideDays={false}
            />
         </PopoverContent>
      </Popover>
   );
}

function ProgramScheduleFields({
   initial,
   errors,
}: {
   initial: ProgramSchedule | null;
   errors?: Record<string, string[]>;
}) {
   const [range, setRange] = React.useState<DateRange | undefined>(() => {
      const from = fromISODate(initial?.startDate);
      const to = fromISODate(initial?.endDate);
      if (!from && !to) return undefined;
      return { from, to };
   });
   const [slots, setSlots] = React.useState<ProgramSlot[]>(
      initial?.slots ?? [{ dayOfWeek: 1, time: "" }],
   );

   const updateSlot = (idx: number, patch: Partial<ProgramSlot>) =>
      setSlots((prev) =>
         prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      );
   const addSlot = () =>
      setSlots((prev) => [...prev, { dayOfWeek: 1, time: "" }]);
   const removeSlot = (idx: number) =>
      setSlots((prev) => prev.filter((_, i) => i !== idx));

   const startDate = range?.from ? toISODate(range.from) : "";
   const endDate = range?.to ? toISODate(range.to) : "";

   return (
      <div className="flex max-h-52 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
         <p className="text-xs font-medium text-muted-foreground">
            Weekly schedule
         </p>
         <input type="hidden" name="start_date" value={startDate} />
         <input type="hidden" name="end_date" value={endDate} />
         <input type="hidden" name="slots" value={JSON.stringify(slots)} />
         <div className="flex flex-col gap-1.5">
            <Label>Date range</Label>
            <DateRangePicker value={range} onChange={setRange} />
            <FieldError messages={errors?.start_date ?? errors?.end_date} />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Days & times</Label>
            <div className="flex flex-col gap-2">
               {slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                     <Select
                        value={String(slot.dayOfWeek)}
                        onValueChange={(v) =>
                           updateSlot(idx, { dayOfWeek: Number(v) })
                        }
                     >
                        <SelectTrigger className="flex-1">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {DAY_NAMES.map((name, i) => (
                              <SelectItem key={i} value={String(i)}>
                                 {name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                     <Input
                        type="time"
                        step={60}
                        value={slot.time}
                        onChange={(e) =>
                           updateSlot(idx, { time: e.target.value })
                        }
                        className="w-36"
                     />
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSlot(idx)}
                        disabled={slots.length === 1}
                        aria-label="Remove slot"
                     >
                        <X className="size-4" />
                     </Button>
                  </div>
               ))}
            </div>
            <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={addSlot}
               className="self-start"
            >
               <Plus className="size-4" />
               Add day
            </Button>
            <FieldError messages={errors?.slots} />
         </div>
      </div>
   );
}

export function ServiceDialog(props: Props) {
   const isEdit = props.mode === "edit";
   const service = isEdit ? props.service : null;
   const { coaches, forms } = props;

   const [type, setType] = React.useState<"programs" | "private_lessons">(
      service?.type ?? "programs",
   );
   const [coachId, setCoachId] = React.useState<string>(
      service?.coachId ?? "",
   );
   const [title, setTitle] = React.useState<string>(service?.title ?? "");
   const [description, setDescription] = React.useState<string>(
      service?.description ?? "",
   );
   const [durationMinutes, setDurationMinutes] = React.useState<string>(
      String(service?.durationMinutes ?? 60),
   );
   const [priceCad, setPriceCad] = React.useState<string>(
      centsToMoneyString(service?.priceCents ?? null),
   );

   const [isForChildren, setIsForChildren] = React.useState(
      service?.isForChildren ?? false,
   );
   const [formId, setFormId] = React.useState(service?.formId ?? "none");

   const [state, formAction, pending] = useActionState<
      ServiceActionState,
      FormData
   >(isEdit ? updateService : createService, null);

   React.useEffect(() => {
      if (service) {
         setType(service.type);
         setCoachId(service.coachId ?? "");
         setTitle(service.title ?? "");
         setDescription(service.description ?? "");
         setDurationMinutes(String(service.durationMinutes ?? 60));
         setPriceCad(centsToMoneyString(service.priceCents));
         setIsForChildren(service.isForChildren ?? false);
         setFormId(service.formId ?? "none");
      }
   }, [service]);

   const closeRef = React.useRef<HTMLButtonElement>(null);
   const prevState = React.useRef<ServiceActionState>(null);
   React.useEffect(() => {
      if (state === prevState.current) return;
      prevState.current = state;
      if (state?.message && !state.errors) {
         if (isEdit && props.mode === "edit") {
            props.onOpenChange(false);
         } else {
            closeRef.current?.click();
            setType("programs");
            setCoachId("");
            setTitle("");
            setDescription("");
            setDurationMinutes("60");
            setPriceCad("");
            setIsForChildren(false);
            setFormId("none");
         }
      }
   }, [state, isEdit, props]);

   const errors = state?.errors;

   const dialogControl = isEdit
      ? { open: props.open, onOpenChange: props.onOpenChange }
      : {};

   const showForm = !isEdit || service !== null;

   const initialSchedule = service?.scheduledAt ?? null;

   return (
      <Dialog {...dialogControl}>
         {!isEdit && (
            <DialogTrigger asChild>
               <Button>
                  <Plus />
                  Add service
               </Button>
            </DialogTrigger>
         )}
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>
                  {isEdit ? "Edit service" : "New service"}
               </DialogTitle>
               <DialogDescription>
                  {isEdit
                     ? "Update fields below. Only changed fields are saved."
                     : "Create a coaching session or bookable service. Pricing is stored in Stripe."}
               </DialogDescription>
            </DialogHeader>

            {showForm && (
               <form
                  key={service?.id ?? "new"}
                  action={formAction}
                  className="flex flex-col gap-3"
               >
                  {service && (
                     <input
                        type="hidden"
                        name="service_id"
                        value={service.id}
                     />
                  )}

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="title">Title</Label>
                     <Input
                        id="title"
                        name="title"
                        required
                        maxLength={500}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                     />
                     <FieldError messages={errors?.title} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="description">Description</Label>
                     <Textarea
                        id="description"
                        name="description"
                        maxLength={5000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="max-h-40 overflow-y-auto"
                     />
                     <FieldError messages={errors?.description} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="type">Type</Label>
                        <Select
                           name="type"
                           value={type}
                           onValueChange={(v) => {
                              const next = v as "programs" | "private_lessons";
                              setType(next);
                              if (next === "private_lessons") {
                                 setIsForChildren(false);
                                 setFormId("none");
                              }
                           
                           }}
                        >
                           <SelectTrigger id="type" className="w-full">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="programs">Programs</SelectItem>
                              <SelectItem value="private_lessons">
                                 Private lessons
                              </SelectItem>
                           </SelectContent>
                        </Select>
                        <FieldError messages={errors?.type} />
                     </div>

                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="duration_minutes">Duration (min)</Label>
                        <Input
                           id="duration_minutes"
                           name="duration_minutes"
                           type="number"
                           min={1}
                           max={1440}
                           required
                           value={durationMinutes}
                           onChange={(e) => setDurationMinutes(e.target.value)}
                        />
                        <FieldError messages={errors?.duration_minutes} />
                     </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="price_cad">Price (CAD)</Label>
                     <ButtonGroup className="w-full">
                        <ButtonGroupText aria-hidden="true">
                           <DollarSign />
                        </ButtonGroupText>
                        <Input
                           id="price_cad"
                           name="price_cad"
                           type="number"
                           min={0}
                           max={10000}
                           required
                           value={priceCad}
                           onChange={(e) => setPriceCad(e.target.value)}
                        />
                     </ButtonGroup>
                     <FieldError messages={errors?.price_cad} />
                  </div>

                  {type === "programs" && (
                     <ProgramScheduleFields
                        initial={initialSchedule}
                        errors={errors}
                     />
                  )}

                  {type === "programs" && (
                     <>
                        <input
                           type="hidden"
                           name="is_for_children"
                           value={isForChildren ? "true" : "false"}
                        />
                        <div className="flex items-center gap-2">
                        <Checkbox
                           id="is_for_children"
                           checked={isForChildren}
                           onCheckedChange={(checked) => {
                              setIsForChildren(checked === true);
                              if (!checked) setFormId("none");
                           }}
                        />
                           <Label htmlFor="is_for_children">For children</Label>
                        </div>

                        {isForChildren && (
                           <div className="flex flex-col gap-1.5">
                              <Label htmlFor="form_id">Attached form (optional)</Label>
                              <Select name="form_id" value={formId} onValueChange={setFormId}>
                                 <SelectTrigger id="form_id" className="w-full">
                                    <SelectValue placeholder="No form" />
                                 </SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="none">No form</SelectItem>
                                    {forms.map((f) => (
                                       <SelectItem key={f.id} value={f.id}>
                                          {f.name}
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                              <FieldError messages={errors?.form_id} />
                           </div>
                        )}
                     </>
                  )}

                  {type === "private_lessons" && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="coach_id">Coach</Label>
                        <Select
                           name="coach_id"
                           value={coachId}
                           onValueChange={setCoachId}
                        >
                           <SelectTrigger id="coach_id" className="w-full">
                              <SelectValue
                                 placeholder={
                                    coaches.length === 0
                                       ? "No coaches available"
                                       : "Select a coach"
                                 }
                              />
                           </SelectTrigger>
                           <SelectContent>
                              {coaches.map((c) => (
                                 <SelectItem key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <FieldError messages={errors?.coach_id} />
                     </div>
                  )}

                  <FieldError messages={errors?._form} />

                  <DialogFooter>
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
                             : "Create service"}
                     </Button>
                  </DialogFooter>
               </form>
            )}
         </DialogContent>
      </Dialog>
   );
}
