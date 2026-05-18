"use client";

import * as React from "react";
import { useActionState } from "react";

import { AvailabilityCalendar } from "@/components/scheduling/availability-calendar";
import { MessageYourCoach } from "@/components/scheduling/message-your-coach";
import { cn } from "@/lib/utils";
import type { TimeSlot, Weekday } from "@/lib/scheduling/time-slot";
import {
   selectAvailabilities,
   type SchedulingActionState,
} from "@/app/scheduling/actions";

type AvailabilityFormProps = {
   sessionId: string;
   weeks?: number;
   daysOfWeek?: Weekday[];
   startHour?: number;
   endHour?: number;
   className?: string;
};

const DEFAULT_DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export function AvailabilityForm({
   sessionId,
   weeks = 2,
   daysOfWeek = DEFAULT_DAYS,
   startHour = 8,
   endHour = 20,
   className,
}: AvailabilityFormProps) {
   const [slots, setSlots] = React.useState<TimeSlot[]>([]);
   const [coachMessage, setCoachMessage] = React.useState("");
   const [anchor, setAnchor] = React.useState<Date | null>(null);

   React.useEffect(() => {
      setAnchor(new Date());
   }, []);

   const [state, formAction, pending] = useActionState<
      SchedulingActionState,
      FormData
   >(selectAvailabilities, null);

   const errors = state?.errors;

   return (
      <form
         action={formAction}
         className={cn(
            "mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-border bg-card shadow-sm",
            className,
         )}
      >
         <input type="hidden" name="session_id" value={sessionId} />
         <input
            type="hidden"
            name="time_slots"
            value={JSON.stringify(slots)}
         />

         <AvailabilityCalendar
            weeks={weeks}
            daysOfWeek={daysOfWeek}
            startHour={startHour}
            endHour={endHour}
            anchor={anchor}
            value={slots}
            onChange={setSlots}
         />

         <div className="border-t border-border bg-accent/30 p-4">
            <MessageYourCoach
               name="notes"
               value={coachMessage}
               onChange={setCoachMessage}
               pending={pending}
            />

            <FormErrors errors={errors} />

            {state?.message && !errors ? (
               <p className="mt-2 text-sm text-primary">{state.message}</p>
            ) : null}
         </div>
      </form>
   );
}

function FormErrors({ errors }: { errors?: Record<string, string[]> }) {
   if (!errors) return null;
   const messages = Object.values(errors).flat();
   if (messages.length === 0) return null;
   return (
      <ul className="mt-2 flex flex-col gap-0.5 text-sm text-destructive">
         {messages.map((m, i) => (
            <li key={i}>{m}</li>
         ))}
      </ul>
   );
}
