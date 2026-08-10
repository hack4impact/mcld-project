import { Badge } from "@/components/ui/badge";

const STATUS_CLASS: Record<string, string> = {
   confirmed: "bg-green-700/80 text-white",
   completed: "bg-green-700/80 text-white",
   pending: "bg-amber-700/80 text-white",
   awaiting_payment: "bg-amber-700/80 text-white",
   cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
   return (
      <Badge
         className={
            STATUS_CLASS[status] ?? "bg-secondary/80 text-secondary-foreground"
         }
      >
         {status.replace(/_/g, " ")}
      </Badge>
   );
}
