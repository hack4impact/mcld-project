"use client";

import * as React from "react";

export function MessageYourCoach() {
   const [coachMessage, setCoachMessage] = React.useState("");

   return (
      <div className="bg-[#EAF5FD] p-2">
         <p className="mb-2 text-base font-semibold text-foreground">
            Message to your coach{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
               Optional
            </span>
         </p>
         <div className="grid gap-2 md:grid-cols-[1fr_260px]">
            <div className="overflow-hidden rounded-lg border border-[#D3DCE6] bg-white">
               <textarea
                  value={coachMessage}
                  onChange={(event) => setCoachMessage(event.target.value)}
                  rows={3}
                  placeholder="e.g. I'm generally free on mornings - Tuesday afternoons are tough for me this month..."
                  className="min-h-[112px] w-full resize-none border-0 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5D9CEC]"
               />
            </div>
            <button
               type="button"
               className="min-h-[112px] w-full rounded-lg border border-[#2D73C8] bg-[#2D73C8] px-6 text-lg font-semibold text-white transition-colors hover:bg-[#2566B4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5D9CEC]"
            >
               Submit Availability
            </button>
         </div>
      </div>
   );
}
