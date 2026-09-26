import type { ServiceStatus } from "@/app/(authenticated)/services/queries";

export function statusBadgeClass(status: ServiceStatus) {
   switch (status) {
      case "active":
         return "bg-success-soft text-success";
      case "disabled":
         return "bg-warning-soft text-warning";
      case "archived":
         return "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
      default:
         return "bg-muted text-muted-foreground";
   }
}

export function subscriptionBadgeClass(requiresSubscription: boolean) {
   return requiresSubscription
      ? "bg-info-soft text-info"
      : "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
}

export function schedulingBadgeClass(isScheduled: boolean) {
   return isScheduled
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground ring-1 ring-inset ring-border";
}
