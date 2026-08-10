import type { ServiceStatus } from "@/app/(authenticated)/services/queries";

export function statusBadgeClass(status: ServiceStatus) {
   switch (status) {
      case "active":
         return "bg-green-700/80 text-white";
      case "disabled":
         return "bg-amber-700/80 text-white";
      case "archived":
         return "bg-secondary/80 text-secondary-foreground";
      default:
         return "bg-muted text-muted-foreground";
   }
}

export function subscriptionBadgeClass(requiresSubscription: boolean) {
   return requiresSubscription
      ? "bg-blue-700/80 text-white"
      : "bg-secondary/80 text-secondary-foreground";
}
