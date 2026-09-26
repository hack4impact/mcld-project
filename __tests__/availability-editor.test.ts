import {
   addDays,
   buildPreviewWeeks,
   describeSlots,
   formatShortDate,
   formatTime,
   formatTimeRange,
   formatTimeZone,
   hasWindowErrors,
   nextWeekdayOnOrAfter,
   previewRange,
   splitIntoSlots,
   startOfWeekMonday,
   timeZoneOptions,
   todayInTimeZone,
   validateDayWindows,
} from "@/lib/availability-editor";

describe("formatTime", () => {
   it.each([
      ["00:00", "12:00 AM"],
      ["09:05", "9:05 AM"],
      ["12:00", "12:00 PM"],
      ["13:30", "1:30 PM"],
      ["23:59", "11:59 PM"],
   ])("%s → %s", (input, expected) => {
      expect(formatTime(input)).toBe(expected);
   });

   it("formats a range", () => {
      expect(formatTimeRange("09:00", "11:30")).toBe("9:00 AM – 11:30 AM");
   });
});

describe("splitIntoSlots", () => {
   it("cuts back-to-back slots from the window start and reports leftover", () => {
      expect(splitIntoSlots("09:00", "11:30", 60)).toEqual({
         starts: ["09:00", "10:00"],
         leftoverMinutes: 30,
      });
   });

   it("has no leftover when the window divides evenly", () => {
      expect(splitIntoSlots("09:00", "10:30", 45)).toEqual({
         starts: ["09:00", "09:45"],
         leftoverMinutes: 0,
      });
   });

   it("returns no slots when the window is shorter than a lesson", () => {
      expect(splitIntoSlots("09:00", "09:30", 60)).toEqual({
         starts: [],
         leftoverMinutes: 30,
      });
   });

   it("returns no slots for an inverted window", () => {
      expect(splitIntoSlots("11:00", "09:00", 60)).toEqual({
         starts: [],
         leftoverMinutes: 0,
      });
   });
});

describe("describeSlots", () => {
   it("mentions leftover time", () => {
      expect(describeSlots("09:00", "11:30", 60)).toBe(
         "2 × 60-min slots · last 30 min not bookable",
      );
   });

   it("uses the singular for one slot", () => {
      expect(describeSlots("09:00", "10:00", 60)).toBe("1 × 60-min slot");
   });

   it("flags windows too short for a lesson", () => {
      expect(describeSlots("09:00", "09:30", 60)).toBe(
         "Too short for a 60-min lesson",
      );
   });
});

describe("validateDayWindows", () => {
   it("accepts non-overlapping windows", () => {
      const errors = validateDayWindows([
         { start: "09:00", end: "10:00", recurrence: "weekly" },
         { start: "10:00", end: "11:00", recurrence: "weekly" },
      ]);
      expect(errors).toEqual([null, null]);
      expect(hasWindowErrors(errors)).toBe(false);
   });

   it("flags an end time before the start time", () => {
      expect(validateDayWindows([{ start: "11:00", end: "10:00" }])).toEqual([
         "End time must be after start time",
      ]);
   });

   it("flags an end time equal to the start time", () => {
      expect(validateDayWindows([{ start: "10:00", end: "10:00" }])).toEqual([
         "End time must be after start time",
      ]);
   });

   it("flags missing times", () => {
      expect(validateDayWindows([{ start: "", end: "10:00" }])).toEqual([
         "Enter a start and end time",
      ]);
   });

   it("flags both overlapping windows", () => {
      const errors = validateDayWindows([
         { start: "10:00", end: "11:00", recurrence: "weekly" },
         { start: "10:30", end: "12:00", recurrence: "weekly" },
      ]);
      expect(errors).toEqual([
         "Overlaps with 10:30 AM – 12:00 PM",
         "Overlaps with 10:00 AM – 11:00 AM",
      ]);
      expect(hasWindowErrors(errors)).toBe(true);
   });

   it("allows overlapping every-other-week windows on alternate weeks", () => {
      expect(
         validateDayWindows([
            {
               start: "09:00",
               end: "12:00",
               recurrence: "biweekly",
               anchorDate: "2026-09-07",
            },
            {
               start: "10:00",
               end: "14:00",
               recurrence: "biweekly",
               anchorDate: "2026-09-14",
            },
         ]),
      ).toEqual([null, null]);
   });

   it("flags every-other-week windows that land on the same weeks", () => {
      const errors = validateDayWindows([
         {
            start: "09:00",
            end: "12:00",
            recurrence: "biweekly",
            anchorDate: "2026-09-07",
         },
         {
            start: "10:00",
            end: "14:00",
            recurrence: "biweekly",
            anchorDate: "2026-09-21",
         },
      ]);
      expect(hasWindowErrors(errors)).toBe(true);
   });

   it("requires a first week for every-other-week windows", () => {
      expect(
         validateDayWindows([
            { start: "09:00", end: "10:00", recurrence: "biweekly" },
         ]),
      ).toEqual(["Pick the first week for every-other-week hours"]);
   });

   it("ignores invalid neighbours when checking overlap", () => {
      expect(
         validateDayWindows([
            { start: "09:00", end: "10:00" },
            { start: "09:30", end: "09:00" },
         ]),
      ).toEqual([null, "End time must be after start time"]);
   });
});

describe("date helpers", () => {
   it("adds days across month boundaries", () => {
      expect(addDays("2026-09-29", 3)).toBe("2026-10-02");
      expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
   });

   it("finds the Monday of the week", () => {
      expect(startOfWeekMonday("2026-09-26")).toBe("2026-09-21"); // Saturday
      expect(startOfWeekMonday("2026-09-27")).toBe("2026-09-21"); // Sunday
      expect(startOfWeekMonday("2026-09-28")).toBe("2026-09-28"); // Monday
   });

   it("finds the next given weekday", () => {
      expect(nextWeekdayOnOrAfter("2026-09-26", 1)).toBe("2026-09-28");
      expect(nextWeekdayOnOrAfter("2026-09-26", 6)).toBe("2026-09-26");
   });

   it("formats short dates", () => {
      expect(formatShortDate("2026-10-12")).toBe("Mon, Oct 12");
      expect(formatShortDate("2027-01-04", true)).toBe("Mon, Jan 4, 2027");
   });

   it("reads today in the given time zone", () => {
      // 02:00 UTC on Sep 27 is still Sep 26 in Toronto.
      const now = new Date("2026-09-27T02:00:00Z");
      expect(todayInTimeZone("America/Toronto", now)).toBe("2026-09-26");
      expect(todayInTimeZone("UTC", now)).toBe("2026-09-27");
   });
});

describe("time zone helpers", () => {
   it("labels a zone with its city and offset", () => {
      expect(formatTimeZone("America/Toronto", "2026-07-01")).toBe(
         "Toronto (GMT-4)",
      );
      expect(formatTimeZone("America/St_Johns", "2026-07-01")).toBe(
         "St Johns (GMT-2:30)",
      );
   });

   it("uses the offset in effect on the given date", () => {
      expect(formatTimeZone("America/Toronto", "2026-12-01")).toBe(
         "Toronto (GMT-5)",
      );
   });

   it("keeps an uncommon saved zone in the options", () => {
      expect(timeZoneOptions("Asia/Tokyo")[0]).toBe("Asia/Tokyo");
      expect(timeZoneOptions("America/Toronto")).not.toContain("Asia/Tokyo");
   });
});

describe("previewRange", () => {
   it("starts on this week's Monday but only fetches from today", () => {
      expect(previewRange("2026-09-26", 0)).toEqual({
         weekStart: "2026-09-21",
         from: "2026-09-26",
         to: "2026-10-18",
      });
   });

   it("pages forward four weeks at a time", () => {
      expect(previewRange("2026-09-26", 1)).toEqual({
         weekStart: "2026-10-19",
         from: "2026-10-19",
         to: "2026-11-15",
      });
   });
});

describe("buildPreviewWeeks", () => {
   const weeks = buildPreviewWeeks({
      weekStart: "2026-09-21",
      weeks: 2,
      today: "2026-09-23",
      occurrences: [
         { date: "2026-09-21", start: "09:00", end: "10:00", source: "weekly" },
         { date: "2026-09-28", start: "13:00", end: "14:00", source: "weekly" },
         { date: "2026-09-28", start: "09:00", end: "10:00", source: "weekly" },
         {
            date: "2026-09-29",
            start: "10:00",
            end: "11:00",
            source: "override",
         },
      ],
      overrides: [
         { date: "2026-09-29", windows: [{ start: "10:00", end: "11:00" }] },
         { date: "2026-09-30", windows: [] },
      ],
   });

   it("builds Monday-first weeks of seven days", () => {
      expect(weeks).toHaveLength(2);
      expect(weeks[0]!.map((d) => d.date)).toEqual([
         "2026-09-21",
         "2026-09-22",
         "2026-09-23",
         "2026-09-24",
         "2026-09-25",
         "2026-09-26",
         "2026-09-27",
      ]);
   });

   it("hides windows on past days", () => {
      expect(weeks[0]![0]).toMatchObject({ isPast: true, windows: [] });
      expect(weeks[0]![2]!.isPast).toBe(false);
   });

   it("sorts windows by start time", () => {
      expect(weeks[1]![0]!.windows.map((w) => w.start)).toEqual([
         "09:00",
         "13:00",
      ]);
   });

   it("marks custom-hours and day-off overrides", () => {
      expect(weeks[1]![1]!.override).toBe("custom");
      expect(weeks[1]![2]).toMatchObject({ override: "day_off", windows: [] });
      expect(weeks[1]![3]!.override).toBeNull();
   });
});
