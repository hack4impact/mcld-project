import type {
    AvailabilityOverrideWindow,
    AvailabilityWindow,
    CoordinatorWeeklyHours,
 } from "@/lib/db/schema";
 
 export const EMPTY_WEEKLY_HOURS: CoordinatorWeeklyHours = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
 };
 
 export type AvailabilityOccurrence = {
    date: string;
    start: string;
    end: string;
    source: "weekly" | "override";
 };
 
 const MS_PER_DAY = 24 * 60 * 60 * 1000;
 
 function utcMidnight(ymd: string): number {
    const [year, month, day] = ymd.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
 }
 
 function ymdFromUtc(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
 }
 
 function weekday(ymd: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
    return new Date(utcMidnight(ymd)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
 }
 
 function startOfSundayWeek(ymd: string): number {
    const ms = utcMidnight(ymd);
    return ms - new Date(ms).getUTCDay() * MS_PER_DAY;
 }
 
 function isBiweeklyOn(ymd: string, anchorDate: string): boolean {
    const weeks =
       (startOfSundayWeek(ymd) - startOfSundayWeek(anchorDate)) /
       (7 * MS_PER_DAY);
    return weeks % 2 === 0;
 }
 
 function appliesOnDate(window: AvailabilityWindow, ymd: string): boolean {
    if (window.recurrence === "weekly") return true;
    if (!window.anchorDate) return false;
    return isBiweeklyOn(ymd, window.anchorDate);
 }
 
 function eachYmd(from: string, to: string): string[] {
    const days: string[] = [];
    let ms = utcMidnight(from);
    const end = utcMidnight(to);
    while (ms <= end) {
       days.push(ymdFromUtc(ms));
       ms += MS_PER_DAY;
    }
    return days;
 }
 
 export function availabilityForRange({
    hours,
    overrides,
    from,
    to,
 }: {
    hours: CoordinatorWeeklyHours;
    overrides: Record<string, AvailabilityOverrideWindow[]>;
    from: string;
    to: string;
 }): AvailabilityOccurrence[] {
    if (utcMidnight(from) > utcMidnight(to)) return [];
 
    const result: AvailabilityOccurrence[] = [];
 
    for (const date of eachYmd(from, to)) {
       if (Object.hasOwn(overrides, date)) {
          for (const window of overrides[date] ?? []) {
             result.push({
                date,
                start: window.start,
                end: window.end,
                source: "override",
             });
          }
          continue;
       }
 
       for (const window of hours[weekday(date)]) {
          if (!appliesOnDate(window, date)) continue;
          result.push({
             date,
             start: window.start,
             end: window.end,
             source: "weekly",
          });
       }
    }
 
    return result;
 }