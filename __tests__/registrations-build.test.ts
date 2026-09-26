import { buildRegistrations } from "@/app/(authenticated)/registrations/build-registrations";
import { NOW, bookings, sessions, titles } from "./fixtures/registrations";

function build() {
   return buildRegistrations({ bookings, sessions, titles, now: NOW });
}

describe("buildRegistrations", () => {
   it("orders upcoming soonest first with unscheduled lessons last", () => {
      expect(build().upcoming.map((r) => r.id)).toEqual([
         "ses-renaud-oct3",
         "svc-fall",
         "ses-renaud-oct10",
         "ses-renaud-unscheduled",
      ]);
   });

   it("orders past most recent first", () => {
      expect(build().past.map((r) => r.id)).toEqual([
         "ses-paused",
         "ses-renaud-done",
         "svc-summer",
      ]);
   });

   it("treats completed lessons and lessons whose time has passed as past", () => {
      const { past } = build();
      expect(past.find((r) => r.id === "ses-renaud-done")?.timing).toBe("past");
      expect(past.find((r) => r.id === "ses-paused")?.timing).toBe("past");
   });

   it("skips cancelled sessions", () => {
      const { upcoming, past } = build();
      expect([...upcoming, ...past].some((r) => r.id === "ses-cancelled")).toBe(
         false,
      );
   });

   it("keeps each private lesson as its own entry, numbered by booking order", () => {
      const lessons = [...build().upcoming, ...build().past].filter(
         (r) => r.serviceId === "svc-renaud",
      );
      expect(
         Object.fromEntries(
            lessons.map((r) => [
               r.id,
               r.type === "private_lessons" ? r.lessonNumber : undefined,
            ]),
         ),
      ).toEqual({
         "ses-renaud-done": 1,
         "ses-renaud-oct3": 2,
         "ses-renaud-oct10": 3,
         "ses-renaud-unscheduled": 4,
      });
   });

   it("formats lesson times in Toronto time", () => {
      const lesson = build().upcoming[0];
      expect(lesson.type).toBe("private_lessons");
      if (lesson.type !== "private_lessons") return;
      expect(lesson.scheduledLabel).toMatch(/^Sat, Oct 3, 2026, 10:00\sAM$/);
      expect(lesson.bookedAtLabel).toMatch(/^Sep 20, 2026, 8:00\sAM$/);
   });

   it("groups program bookings per service with self and children", () => {
      const fall = build().upcoming.find((r) => r.id === "svc-fall");
      expect(fall?.participants).toEqual({
         self: true,
         children: [{ id: "child-lea", firstName: "Léa", lastName: "Martin" }],
      });
   });

   it("hides archived and deleted services", () => {
      const { upcoming, past } = build();
      const ids = [...upcoming, ...past].map((r) => r.serviceId);
      expect(ids).not.toContain("svc-winter");
      expect(ids).not.toContain("svc-deleted");
   });

   it("keeps disabled services and falls back to a null title", () => {
      expect(build().past.find((r) => r.id === "ses-paused")).toMatchObject({
         serviceStatus: "disabled",
         title: null,
      });
   });

   it("treats a program that ends today as upcoming", () => {
      const endsToday = {
         ...bookings[0]!.service,
         id: "svc-ends-today",
         startDate: "2026-09-01",
         endDate: "2026-09-26",
      };
      const { upcoming } = buildRegistrations({
         bookings: [{ service: endsToday, child: null }],
         sessions: [],
         titles: new Map(),
         now: NOW,
      });
      expect(upcoming.map((r) => r.id)).toEqual(["svc-ends-today"]);
   });
});
