/**
 * @jest-environment node
 */
import {
   listBookableSlots,
   reservePrivateLessonSession,
} from "@/app/private-lessons/actions";
import { EMPTY_WEEKLY_HOURS } from "@/lib/availability";
import {
   coordinatorAvailabilityHours,
   coordinatorAvailabilityOverrides,
   privateLessonSessions,
} from "@/lib/db/schema";

const SERVICE_ID = "11111111-1111-1111-1111-111111111111";
const COORDINATOR_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

// Thursday Oct 1 2026, 8:00 AM in Toronto.
const NOW = new Date("2026-10-01T12:00:00Z");
// Next Monday 9:00 AM and 10:00 AM Toronto (EDT).
const MON_9AM = "2026-10-05T13:00:00.000Z";
const MON_10AM = "2026-10-05T14:00:00.000Z";

// ---- db mock: each select resolves to the rows registered for its table ----
let rowsByTable = new Map<unknown, unknown[]>();
const lockModes: string[] = [];

function selectBuilder() {
   let table: unknown;
   const builder = {
      from(t: unknown) {
         table = t;
         return builder;
      },
      innerJoin: () => builder,
      where: () => builder,
      limit: () => builder,
      orderBy: () => builder,
      for(mode: string) {
         lockModes.push(mode);
         return builder;
      },
      then(
         onFulfilled?: (value: unknown) => unknown,
         onRejected?: (reason: unknown) => unknown,
      ) {
         return Promise.resolve(rowsByTable.get(table) ?? []).then(
            onFulfilled,
            onRejected,
         );
      },
   };
   return builder;
}

const insertValues = jest.fn(() => ({
   returning: () => Promise.resolve([{ id: "session-1" }]),
}));
const findService = jest.fn();
const transaction = jest.fn();

jest.mock("@/lib/db", () => {
   const client = {
      select: () => selectBuilder(),
      insert: () => ({ values: insertValues }),
   };
   return {
      db: {
         ...client,
         query: {
            services: {
               findFirst: (...args: unknown[]) => findService(...args),
            },
         },
         transaction: (fn: (tx: typeof client) => unknown) =>
            transaction(fn, client),
      },
   };
});

const getUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser } }),
}));

function privateLesson(isScheduled: boolean, extra = {}) {
   return {
      id: SERVICE_ID,
      type: "private_lessons",
      status: "active",
      coordinatorId: COORDINATOR_ID,
      durationMinutes: 60,
      isScheduled,
      ...extra,
   };
}

function givenMondayMornings() {
   rowsByTable.set(coordinatorAvailabilityHours, [
      {
         timezone: "America/Toronto",
         hours: {
            ...EMPTY_WEEKLY_HOURS,
            1: [{ start: "09:00", end: "11:30", recurrence: "weekly" }],
         },
      },
   ]);
}

function booking(
   start: string,
   {
      status = "confirmed",
      minutesAgo = 60,
      durationMinutes = 60,
   }: { status?: string; minutesAgo?: number; durationMinutes?: number } = {},
) {
   return {
      scheduledAt: new Date(start),
      status,
      createdAt: new Date(NOW.getTime() - minutesAgo * 60_000),
      durationMinutes,
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
   jest.setSystemTime(NOW);
   rowsByTable = new Map();
   lockModes.length = 0;
   getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
   findService.mockResolvedValue(privateLesson(true));
   transaction.mockImplementation((fn, client) => fn(client));
   givenMondayMornings();
});

afterEach(() => {
   jest.useRealTimers();
});

describe("reservePrivateLessonSession — scheduled lessons", () => {
   it("books an open slot and holds it", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
      expect(insertValues).toHaveBeenCalledWith({
         userId: USER_ID,
         serviceId: SERVICE_ID,
         coordinatorId: COORDINATOR_ID,
         scheduledAt: new Date(MON_9AM),
         selectedTimeSlots: null,
         status: "awaiting_payment",
      });
   });

   it("accepts the slot time written with an offset", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: "2026-10-05T09:00:00-04:00",
      });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ scheduledAt: new Date(MON_9AM) }),
      );
   });

   it("locks the coordinator inside a transaction before checking", async () => {
      await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(lockModes).toEqual(["update"]);
   });

   it("refuses a slot someone already booked", async () => {
      rowsByTable.set(privateLessonSessions, [booking(MON_9AM)]);

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toMatchObject({ code: "slot_taken" });
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("refuses a slot overlapped by a longer lesson from another service", async () => {
      // 90 minutes from 8:30 AM covers the 9:00 AM slot.
      rowsByTable.set(privateLessonSessions, [
         booking("2026-10-05T12:30:00.000Z", { durationMinutes: 90 }),
      ]);

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toMatchObject({ code: "slot_taken" });
   });

   it("refuses a slot held by someone else's unfinished checkout", async () => {
      rowsByTable.set(privateLessonSessions, [
         booking(MON_9AM, { status: "awaiting_payment", minutesAgo: 5 }),
      ]);

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toMatchObject({ code: "slot_taken" });
   });

   it("frees a slot whose hold has expired", async () => {
      rowsByTable.set(privateLessonSessions, [
         booking(MON_9AM, { status: "awaiting_payment", minutesAgo: 60 }),
      ]);

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
   });

   it("rejects a time that isn't one of the coordinator's slots", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: "2026-10-05T13:30:00.000Z",
      });

      expect(result).toMatchObject({ code: "invalid_slot" });
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("rejects leftover time at the end of a window", async () => {
      // 11:00 AM would run past the 11:30 AM end of the window.
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: "2026-10-05T15:00:00.000Z",
      });

      expect(result).toMatchObject({ code: "invalid_slot" });
   });

   it("rejects a slot on a day off", async () => {
      rowsByTable.set(coordinatorAvailabilityOverrides, [
         { date: "2026-10-05", windows: [] },
      ]);

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toMatchObject({ code: "invalid_slot" });
   });

   it("rejects a slot in the past", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: "2026-09-28T13:00:00.000Z",
      });

      expect(result).toMatchObject({ code: "invalid_slot" });
   });

   it("requires a slot", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
      });

      expect(result).toMatchObject({ code: "slot_required" });
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("rejects a malformed slot time", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: "next monday",
      });

      expect(result).toHaveProperty("error");
      expect(insertValues).not.toHaveBeenCalled();
   });
});

describe("reservePrivateLessonSession — non-scheduled lessons", () => {
   beforeEach(() => {
      findService.mockResolvedValue(privateLesson(false));
   });

   it("creates a session with no time", async () => {
      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
      });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
      expect(insertValues).toHaveBeenCalledWith({
         userId: USER_ID,
         serviceId: SERVICE_ID,
         coordinatorId: COORDINATOR_ID,
         selectedTimeSlots: null,
         status: "awaiting_payment",
      });
      expect(transaction).not.toHaveBeenCalled();
   });

   it("ignores a slot sent for a non-scheduled lesson", async () => {
      await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(insertValues).toHaveBeenCalledWith(
         expect.not.objectContaining({ scheduledAt: expect.anything() }),
      );
   });
});

describe("reservePrivateLessonSession — guards", () => {
   it("requires a signed-in user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toEqual({ error: "Not authenticated" });
      expect(insertValues).not.toHaveBeenCalled();
   });

   it("rejects a program", async () => {
      findService.mockResolvedValue(privateLesson(true, { type: "programs" }));

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toEqual({ error: "Service is not a private lesson" });
   });

   it("rejects an inactive service", async () => {
      findService.mockResolvedValue(
         privateLesson(true, { status: "disabled" }),
      );

      const result = await reservePrivateLessonSession({
         serviceId: SERVICE_ID,
         slotStart: MON_9AM,
      });

      expect(result).toEqual({ error: "Service is not available" });
   });
});

describe("listBookableSlots", () => {
   it("returns the open slots for the requested week", async () => {
      const result = await listBookableSlots({
         serviceId: SERVICE_ID,
         from: "2026-10-05",
         to: "2026-10-11",
      });

      expect(result).toEqual({
         timezone: "America/Toronto",
         from: "2026-10-05",
         to: "2026-10-11",
         today: "2026-10-01",
         slots: [
            {
               start: MON_9AM,
               end: MON_10AM,
               date: "2026-10-05",
               time: "09:00",
            },
            {
               start: MON_10AM,
               end: "2026-10-05T15:00:00.000Z",
               date: "2026-10-05",
               time: "10:00",
            },
         ],
         nextAvailableDate: null,
      });
   });

   it("leaves out booked slots", async () => {
      rowsByTable.set(privateLessonSessions, [booking(MON_9AM)]);

      const result = await listBookableSlots({
         serviceId: SERVICE_ID,
         from: "2026-10-05",
         to: "2026-10-11",
      });

      expect("slots" in result && result.slots.map((s) => s.time)).toEqual([
         "10:00",
      ]);
   });

   it("defaults to the current week and points to the next open date", async () => {
      // This week's Monday (Sep 28) has passed, so nothing is left this week.
      const result = await listBookableSlots({ serviceId: SERVICE_ID });

      expect(result).toMatchObject({
         from: "2026-09-28",
         to: "2026-10-04",
         slots: [],
         nextAvailableDate: "2026-10-05",
      });
   });

   it("reports no next date when the coordinator has no availability", async () => {
      rowsByTable.set(coordinatorAvailabilityHours, []);

      const result = await listBookableSlots({ serviceId: SERVICE_ID });

      expect(result).toMatchObject({ slots: [], nextAvailableDate: null });
   });

   it("rejects a non-scheduled lesson", async () => {
      findService.mockResolvedValue(privateLesson(false));

      const result = await listBookableSlots({ serviceId: SERVICE_ID });

      expect(result).toEqual({
         error: "This lesson is not booked at a set time",
      });
   });

   it("requires a signed-in user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await listBookableSlots({ serviceId: SERVICE_ID });

      expect(result).toEqual({ error: "Not authenticated" });
   });

   it("rejects a range longer than a year", async () => {
      const result = await listBookableSlots({
         serviceId: SERVICE_ID,
         from: "2026-10-01",
         to: "2027-12-01",
      });

      expect(result).toEqual({ error: "Range cannot be longer than one year" });
   });
});
