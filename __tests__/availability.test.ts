import {
   availabilityForRange,
   EMPTY_WEEKLY_HOURS,
} from "@/lib/availability";
import type { CoordinatorWeeklyHours } from "@/lib/db/schema";

const mondayWeekly: CoordinatorWeeklyHours = {
   ...EMPTY_WEEKLY_HOURS,
   1: [{ start: "09:00", end: "11:00", recurrence: "weekly" }],
};

describe("availabilityForRange", () => {
   it("expands weekly hours onto matching weekdays", () => {
      expect(
         availabilityForRange({
            hours: mondayWeekly,
            overrides: {},
            from: "2026-03-01",
            to: "2026-03-07",
         }),
      ).toEqual([
         {
            date: "2026-03-02",
            start: "09:00",
            end: "11:00",
            source: "weekly",
         },
      ]);
   });

   it("replaces weekly hours when an override exists for that date", () => {
      expect(
         availabilityForRange({
            hours: mondayWeekly,
            overrides: {
               "2026-03-02": [{ start: "13:00", end: "15:00" }],
            },
            from: "2026-03-01",
            to: "2026-03-07",
         }),
      ).toEqual([
         {
            date: "2026-03-02",
            start: "13:00",
            end: "15:00",
            source: "override",
         },
      ]);
   });

   it("treats an empty override as a full day off", () => {
      expect(
         availabilityForRange({
            hours: mondayWeekly,
            overrides: { "2026-03-02": [] },
            from: "2026-03-01",
            to: "2026-03-07",
         }),
      ).toEqual([]);
   });

   it("skips biweekly windows on the off week", () => {
      const hours: CoordinatorWeeklyHours = {
         ...EMPTY_WEEKLY_HOURS,
         1: [
            {
               start: "09:00",
               end: "11:00",
               recurrence: "biweekly",
               anchorDate: "2026-03-02",
            },
         ],
      };

      expect(
         availabilityForRange({
            hours,
            overrides: {},
            from: "2026-03-02",
            to: "2026-03-16",
         }),
      ).toEqual([
         {
            date: "2026-03-02",
            start: "09:00",
            end: "11:00",
            source: "weekly",
         },
         {
            date: "2026-03-16",
            start: "09:00",
            end: "11:00",
            source: "weekly",
         },
      ]);
   });

   it("returns nothing when from is after to", () => {
      expect(
         availabilityForRange({
            hours: mondayWeekly,
            overrides: {},
            from: "2026-03-07",
            to: "2026-03-01",
         }),
      ).toEqual([]);
   });
});
