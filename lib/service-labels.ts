import type {
   ServiceStatus,
   ServiceType,
} from "@/app/(authenticated)/services/queries";

export function serviceTypeLabel(type: ServiceType): string {
   return type === "private_lessons" ? "Private lesson" : "Program";
}

const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
   active: "Active",
   archived: "Archived",
   disabled: "Unavailable",
   deleted: "No longer offered",
};

export function serviceStatusLabel(status: ServiceStatus): string {
   return SERVICE_STATUS_LABELS[status];
}

export const DAY_NAMES = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
] as const;

export function dayOfWeekLabel(dayOfWeek: number): string {
   return DAY_NAMES[dayOfWeek] ?? String(dayOfWeek);
}
