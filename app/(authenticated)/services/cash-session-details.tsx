import type { CashSessionDetails as Details } from "@/lib/cash-session-read-model";

export function CashSessionDetails({ details }: { details?: Details }) {
   if (!details) return null;
   const when = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "medium",
      timeStyle: "short",
   }).format(details.sessionAt);
   const amount = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: details.currency,
   }).format(details.amountCents / 100);
   return (
      <span className="block text-xs text-muted-foreground">
         {when} (Toronto) · {details.durationMinutes} min · {amount} cash
      </span>
   );
}
