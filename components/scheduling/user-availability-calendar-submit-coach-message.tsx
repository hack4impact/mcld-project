"use client";

import { AvailabilityCalendar } from "@/components/scheduling/users-availability-calendar";
import { MessageYourCoach } from "@/components/scheduling/message-your-coach";
import type { Weekday } from "@/lib/scheduling/time-slot";

const AVAILABLE_DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function UserAvailabilityCalendarSubmitCoachMessage() {
   return (
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-xl border border-[#C5DFF5] bg-card shadow-sm">
         <div>
            <AvailabilityCalendar
               weeks={2}
               daysOfWeek={AVAILABLE_DAYS}
               startHour={8}
               endHour={20}
               embedded
               className="max-w-none"
            />
         </div>
         <div className="border-t border-[#C5DFF5]">
            <MessageYourCoach />
         </div>
      </div>
   );
}
