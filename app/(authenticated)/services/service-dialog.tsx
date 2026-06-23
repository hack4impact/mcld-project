"use client";

import * as React from "react";
import { useActionState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, DollarSign, Plus, X } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
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
   CoordinatorOption,
   ServiceView,
} from "@/app/(authenticated)/services/queries";

type Props = { coordinators: CoordinatorOption[] } & (
   | { mode: "add" }
   | {
        mode: "edit";
        service: ServiceView | null;
        open: boolean;
        onOpenChange: (open: boolean) => void;
     }
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

function CoordinatorMultiSelect({
   coordinators,
   value,
   onChange,
}: {
   coordinators: CoordinatorOption[];
   value: string[];
   onChange: (ids: string[]) => void;
}) {
   const [open, setOpen] = React.useState(false);
   const selected = coordinators.filter((c) => value.includes(c.id));
   const toggle = (id: string) =>
      onChange(
         value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
      );

   return (
      <div className="flex flex-col gap-1.5">
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between font-normal"
                  disabled={coordinators.length === 0}
               >
                  <span className="truncate">
                     {selected.length === 0
                        ? coordinators.length === 0
                           ? "No coordinators available"
                           : "Select coordinators"
                        : `${selected.length} selected`}
                  </span>
                  <ChevronsUpDown className="size-4 opacity-50" />
               </Button>
            </PopoverTrigger>
            <PopoverContent
               className="w-[var(--radix-popover-trigger-width)] p-1"
               align="start"
            >
               <div className="max-h-52 overflow-y-auto">
                  {coordinators.map((c) => {
                     const isSelected = value.includes(c.id);
                     return (
                        <button
                           key={c.id}
                           type="button"
                           onClick={() => toggle(c.id)}
                           className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                           <span className="flex size-4 items-center justify-center">
                              {isSelected && <Check className="size-4" />}
                           </span>
                           <span className="truncate">
                              {c.firstName} {c.lastName}
                           </span>
                        </button>
                     );
                  })}
               </div>
            </PopoverContent>
         </Popover>
         {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
               {selected.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1">
                     {c.firstName} {c.lastName}
                     <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        aria-label={`Remove ${c.firstName} ${c.lastName}`}
                     >
                        <X className="size-3" />
                     </button>
                  </Badge>
               ))}
            </div>
         )}
      </div>
   );
}

export function ServiceDialog(props: Props) {
   const isEdit = props.mode === "edit";
   const service = isEdit ? props.service : null;
   const { coordinators } = props;

   const [type, setType] = React.useState<"programs" | "private_lessons">(
      service?.type ?? "programs",
   );
   const [coordinatorId, setCoordinatorId] = React.useState<string>(
      service?.coordinatorId ?? "",
   );
   const [coordinatorIds, setCoordinatorIds] = React.useState<string[]>(
      service?.coordinatorIds ?? [],
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
   const [state, formAction, pending] = useActionState<
      ServiceActionState,
      FormData
   >(isEdit ? updateService : createService, null);

   React.useEffect(() => {
      if (service) {
         setType(service.type);
         setCoordinatorId(service.coordinatorId ?? "");
         setCoordinatorIds(service.coordinatorIds ?? []);
         setTitle(service.title ?? "");
         setDescription(service.description ?? "");
         setDurationMinutes(String(service.durationMinutes ?? 60));
         setPriceCad(centsToMoneyString(service.priceCents));
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
            setCoordinatorId("");
            setCoordinatorIds([]);
            setTitle("");
            setDescription("");
            setDurationMinutes("60");
            setPriceCad("");
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
                     : "Create a program or private lesson. Pricing is stored in Stripe."}
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
                        {/* React 19 resets the <form> after every action, 
                            which reverts a Radix Select's native <select name> 
                            to its first option without re-syncing the controlled value. */}
                        <input type="hidden" name="type" value={type} />
                        <Select
                           value={type}
                           onValueChange={(v) =>
                              setType(v as "programs" | "private_lessons")
                           }
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
                     <>
                        <ProgramScheduleFields
                           initial={initialSchedule}
                           errors={errors}
                        />
                        <div className="flex flex-col gap-1.5">
                           <Label>Coordinators</Label>
                           <input
                              type="hidden"
                              name="coordinator_ids"
                              value={JSON.stringify(coordinatorIds)}
                           />
                           <CoordinatorMultiSelect
                              coordinators={coordinators}
                              value={coordinatorIds}
                              onChange={setCoordinatorIds}
                           />
                           <FieldError messages={errors?.coordinator_ids} />
                        </div>
                     </>
                  )}

                  {type === "private_lessons" && (
                     <div className="flex flex-col gap-1.5">
                        <Label htmlFor="coordinator_id">Coordinator</Label>
                        <input
                           type="hidden"
                           name="coordinator_id"
                           value={coordinatorId}
                        />
                        <Select
                           value={coordinatorId}
                           onValueChange={setCoordinatorId}
                        >
                           <SelectTrigger
                              id="coordinator_id"
                              className="w-full"
                           >
                              <SelectValue
                                 placeholder={
                                    coordinators.length === 0
                                       ? "No coordinators available"
                                       : "Select a coordinator"
                                 }
                              />
                           </SelectTrigger>
                           <SelectContent>
                              {coordinators.map((c) => (
                                 <SelectItem key={c.id} value={c.id}>
                                    {c.firstName} {c.lastName}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <FieldError messages={errors?.coordinator_id} />
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
