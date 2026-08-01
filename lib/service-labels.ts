import type { ServiceType } from "@/app/(authenticated)/services/queries";

export function serviceTypeLabel(type: ServiceType): string {
   return type === "private_lessons" ? "Private lesson" : "Program";
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
