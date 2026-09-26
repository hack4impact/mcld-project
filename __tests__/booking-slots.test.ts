/**
 * @jest-environment node
 */
import { availabilityForRange, EMPTY_WEEKLY_HOURS } from "@/lib/availability";
import {
   generateBookableSlots,
   HOLD_MINUTES,
   isStaleHold,
   rangeBounds,
   zonedTimeToUtc,
} from "@/lib/booking-slots";
import type { CoordinatorWeeklyHours } from "@/lib/db/schema";

const TZ = "America/Toronto";
// Thursday Oct 1 2026, 8:00 AM in Toronto.
const NOW = new Date("2026-10-01T12:00:00Z");

function slotsFor({
   hours = EMPTY_WEEKLY_HOURS,
   overrides = {},
   from,
   to,
   durationMinutes = 60,
   busy = [],
   now = NOW,
   timeZone = TZ,
}: {
   hours?: CoordinatorWeeklyHours;
   overrides?: Record<string, { start: string; end: string }[]>;
   from: string;
   to: string;
   durationMinutes?: number;
   busy?: { start: Date; end: Date }[];
   now?: Date;
   timeZone?: string;
}) {
   return generateBookableSlots({
      occurrences: availabilityForRange({ hours, overrides, from, to }),
      timeZone,
      durationMinutes,
      busy,
      now,
   });
}

const mondayMorning: CoordinatorWeeklyHours = {
   ...EMPTY_WEEKLY_HOURS,
   1: [{ start: "09:00", end: "11:30", recurrence: "weekly" }],
};

describe("zonedTimeToUtc", () => {
   it("converts summer (EDT, UTC-4) wall-clock times", () => {
      expect(zonedTimeToUtc("2026-10-05", "09:00", TZ).toISOString()).toBe(
         "2026-10-05T13:00:00.000Z",
      );
   });

   it("converts winter (EST, UTC-5) wall-clock times", () => {
      expect(zonedTimeToUtc("2026-12-07", "09:00", TZ).toISOString()).toBe(
         "2026-12-07T14:00:00.000Z",
      );
   });

   it("handles the spring-forward day", () => {
      // Clocks jump 2:00 → 3:00 on Mar 8 2026; 9:00 AM is already EDT.
      expect(zonedTimeToUtc("2026-03-08", "09:00", TZ).toISOString()).toBe(
         "2026-03-08T13:00:00.000Z",
      );
      expect(zonedTimeToUtc("2026-03-08", "03:00", TZ).toISOString()).toBe(
         "2026-03-08T07:00:00.000Z",
      );
   });

   it("handles the fall-back day", () => {
      // Clocks go 2:00 → 1:00 on Nov 1 2026; 9:00 AM is EST.
      expect(zonedTimeToUtc("2026-11-01", "09:00", TZ).toISOString()).toBe(
         "2026-11-01T14:00:00.000Z",
      );
   });

   it("works for other zones", () => {
      expect(
         zonedTimeToUtc("2026-10-05", "09:00", "Europe/Paris").toISOString(),
      ).toBe("2026-10-05T07:00:00.000Z");
      expect(zonedTimeToUtc("2026-10-05", "09:00", "UTC").toISOString()).toBe(
         "2026-10-05T09:00:00.000Z",
      );
   });
});

describe("generateBookableSlots", () => {
   it("cuts windows into back-to-back slots and drops leftover time", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-05",
         to: "2026-10-05",
      });

      expect(slots).toEqual([
         {
            start: "2026-10-05T13:00:00.000Z",
            end: "2026-10-05T14:00:00.000Z",
            date: "2026-10-05",
            time: "09:00",
         },
         {
            start: "2026-10-05T14:00:00.000Z",
            end: "2026-10-05T15:00:00.000Z",
            date: "2026-10-05",
            time: "10:00",
         },
      ]);
   });

   it("uses the lesson duration", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-05",
         to: "2026-10-05",
         durationMinutes: 45,
      });
      expect(slots.map((s) => s.time)).toEqual(["09:00", "09:45", "10:30"]);
   });

   it("offers nothing when the window is shorter than the lesson", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-05",
         to: "2026-10-05",
         durationMinutes: 160,
      });
      expect(slots).toEqual([]);
   });

   it("keeps times correct across a daylight-saving change", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-26",
         to: "2026-11-02",
      });
      expect(slots.map((s) => s.start)).toEqual([
         "2026-10-26T13:00:00.000Z", // EDT
         "2026-10-26T14:00:00.000Z",
         "2026-11-02T14:00:00.000Z", // EST
         "2026-11-02T15:00:00.000Z",
      ]);
   });

   it("drops slots in the past", () => {
      const slots = slotsFor({
         hours: {
            ...EMPTY_WEEKLY_HOURS,
            4: [{ start: "07:00", end: "10:00", recurrence: "weekly" }],
         },
         from: "2026-10-01",
         to: "2026-10-01",
      });
      // 7:00 AM and 8:00 AM have started by 8:00 AM; only 9:00 AM is left.
      expect(slots.map((s) => s.time)).toEqual(["09:00"]);
   });

   it("drops slots overlapping an existing lesson, even of another length", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-05",
         to: "2026-10-05",
         busy: [
            // A 90-minute lesson 8:30–10:00 from another service.
            {
               start: new Date("2026-10-05T12:30:00Z"),
               end: new Date("2026-10-05T14:00:00Z"),
            },
         ],
      });
      expect(slots.map((s) => s.time)).toEqual(["10:00"]);
   });

   it("keeps slots that only touch an existing lesson", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         from: "2026-10-05",
         to: "2026-10-05",
         busy: [
            {
               start: new Date("2026-10-05T14:00:00Z"),
               end: new Date("2026-10-05T15:00:00Z"),
            },
         ],
      });
      expect(slots.map((s) => s.time)).toEqual(["09:00"]);
   });

   it("respects a day-off override", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         overrides: { "2026-10-05": [] },
         from: "2026-10-05",
         to: "2026-10-12",
      });
      expect(slots.map((s) => s.date)).toEqual(["2026-10-12", "2026-10-12"]);
   });

   it("uses custom override hours instead of the weekly ones", () => {
      const slots = slotsFor({
         hours: mondayMorning,
         overrides: { "2026-10-05": [{ start: "14:00", end: "16:00" }] },
         from: "2026-10-05",
         to: "2026-10-05",
      });
      expect(slots.map((s) => s.time)).toEqual(["14:00", "15:00"]);
   });

   it("respects every-other-week windows", () => {
      const slots = slotsFor({
         hours: {
            ...EMPTY_WEEKLY_HOURS,
            1: [
               {
                  start: "09:00",
                  end: "10:00",
                  recurrence: "biweekly",
                  anchorDate: "2026-10-05",
               },
            ],
         },
         from: "2026-10-05",
         to: "2026-10-26",
      });
      expect(slots.map((s) => s.date)).toEqual(["2026-10-05", "2026-10-19"]);
   });

   it("returns slots sorted by start time", () => {
      const slots = slotsFor({
         hours: {
            ...EMPTY_WEEKLY_HOURS,
            1: [
               { start: "14:00", end: "15:00", recurrence: "weekly" },
               { start: "09:00", end: "10:00", recurrence: "weekly" },
            ],
         },
         from: "2026-10-05",
         to: "2026-10-05",
      });
      expect(slots.map((s) => s.time)).toEqual(["09:00", "14:00"]);
   });
});

describe("rangeBounds", () => {
   it("pads the local date range by a day on each side", () => {
      const bounds = rangeBounds("2026-10-05", "2026-10-11", TZ);
      expect(bounds.start.toISOString()).toBe("2026-10-04T04:00:00.000Z");
      expect(bounds.end.toISOString()).toBe("2026-10-13T04:00:00.000Z");
   });
});

describe("isStaleHold", () => {
   it("keeps a recent hold", () => {
      const createdAt = new Date(NOW.getTime() - 10 * 60_000);
      expect(isStaleHold(createdAt, NOW)).toBe(false);
   });

   it("releases a hold older than the hold window", () => {
      const createdAt = new Date(NOW.getTime() - (HOLD_MINUTES + 1) * 60_000);
      expect(isStaleHold(createdAt, NOW)).toBe(true);
   });
});
