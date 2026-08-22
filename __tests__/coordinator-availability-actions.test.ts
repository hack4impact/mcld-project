/**
 * @jest-environment node
 */
import {
   saveCoordinatorWeeklyHours,
   setCoordinatorAvailabilityOverride,
   clearCoordinatorAvailabilityOverride,
   listCoordinatorAvailability,
} from "@/app/coaching/actions";
import { EMPTY_WEEKLY_HOURS } from "@/lib/availability";

const COORDINATOR_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_COORDINATOR_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
const insertValues = jest.fn(() => ({ onConflictDoUpdate }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

const deleteWhere = jest.fn().mockResolvedValue(undefined);
const deleteFn = jest.fn(() => ({ where: deleteWhere })) as jest.Mock;

const selectLimit = jest.fn();
let selectWhereResult: unknown[] = [];
const selectWhere = jest.fn(() => ({
   limit: selectLimit,
   then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
   ) {
      return Promise.resolve(selectWhereResult).then(onFulfilled, onRejected);
   },
}));
const selectFrom = jest.fn(() => ({ where: selectWhere }));
const select = jest.fn(() => ({ from: selectFrom })) as jest.Mock;

jest.mock("@/lib/db", () => ({
   db: {
      insert: (...args: unknown[]) => insert(...args),
      select: (...args: unknown[]) => select(...args),
      delete: (...args: unknown[]) => deleteFn(...args),
   },
}));

const getUser = jest.fn();
const getClaims = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser, getClaims } }),
}));

const mondayHours = {
   ...EMPTY_WEEKLY_HOURS,
   1: [{ start: "09:00", end: "11:00", recurrence: "weekly" as const }],
};

function asCoordinator(id = COORDINATOR_ID) {
   getUser.mockResolvedValue({ data: { user: { id } } });
   getClaims.mockResolvedValue({
      data: { claims: { user_role: "coordinator" } },
   });
}

function asAdmin() {
   getUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } } });
   getClaims.mockResolvedValue({
      data: { claims: { user_role: "admin" } },
   });
}

beforeEach(() => {
   jest.clearAllMocks();
   selectWhereResult = [];
   selectLimit.mockResolvedValue([]);
});

describe("saveCoordinatorWeeklyHours", () => {
   it("returns Unauthorized when not signed in", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      getClaims.mockResolvedValue({ data: { claims: null } });

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: COORDINATOR_ID,
         hours: EMPTY_WEEKLY_HOURS,
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("returns Unauthorized for a parent", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: COORDINATOR_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "user" } },
      });

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: COORDINATOR_ID,
         hours: EMPTY_WEEKLY_HOURS,
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("lets a coordinator save their own hours", async () => {
      asCoordinator();

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: COORDINATOR_ID,
         hours: EMPTY_WEEKLY_HOURS,
      });

      expect(result).toEqual({ ok: true });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({
            coordinatorId: COORDINATOR_ID,
            timezone: "America/Toronto",
            hours: EMPTY_WEEKLY_HOURS,
         }),
      );
   });

   it("blocks a coordinator from saving another coordinator's hours", async () => {
      asCoordinator();

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: OTHER_COORDINATOR_ID,
         hours: EMPTY_WEEKLY_HOURS,
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("lets an admin save any coordinator's hours", async () => {
      asAdmin();

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: OTHER_COORDINATOR_ID,
         hours: EMPTY_WEEKLY_HOURS,
      });

      expect(result).toEqual({ ok: true });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ coordinatorId: OTHER_COORDINATOR_ID }),
      );
   });

   it("rejects overlapping windows on the same day", async () => {
      asCoordinator();

      const result = await saveCoordinatorWeeklyHours({
         coordinatorId: COORDINATOR_ID,
         hours: {
            ...EMPTY_WEEKLY_HOURS,
            1: [
               { start: "10:00", end: "11:00", recurrence: "weekly" },
               { start: "10:30", end: "12:00", recurrence: "weekly" },
            ],
         },
      });

      expect(result).toEqual({
         error: "Windows on the same day must not overlap",
      });
      expect(insert).not.toHaveBeenCalled();
   });
});

describe("setCoordinatorAvailabilityOverride", () => {
   it("upserts the date override", async () => {
      asCoordinator();

      const result = await setCoordinatorAvailabilityOverride({
         coordinatorId: COORDINATOR_ID,
         date: "2026-03-02",
         windows: [],
      });

      expect(result).toEqual({ ok: true });
      expect(insertValues).toHaveBeenCalledWith({
         coordinatorId: COORDINATOR_ID,
         date: "2026-03-02",
         windows: [],
      });
   });

   it("blocks a coordinator from setting another coordinator's override", async () => {
      asCoordinator();

      const result = await setCoordinatorAvailabilityOverride({
         coordinatorId: OTHER_COORDINATOR_ID,
         date: "2026-03-02",
         windows: [],
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });
});

describe("clearCoordinatorAvailabilityOverride", () => {
   it("deletes the override for that date", async () => {
      asCoordinator();

      const result = await clearCoordinatorAvailabilityOverride({
         coordinatorId: COORDINATOR_ID,
         date: "2026-03-02",
      });

      expect(result).toEqual({ ok: true });
      expect(deleteFn).toHaveBeenCalled();
      expect(deleteWhere).toHaveBeenCalled();
   });
});

describe("listCoordinatorAvailability", () => {
   it("returns Unauthorized for a parent", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: COORDINATOR_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "user" } },
      });

      const result = await listCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         from: "2026-03-01",
         to: "2026-03-07",
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(select).not.toHaveBeenCalled();
   });

   it("expands weekly hours for the requested range", async () => {
      asCoordinator();
      selectLimit.mockResolvedValue([{ hours: mondayHours }]);

      const result = await listCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         from: "2026-03-01",
         to: "2026-03-07",
      });

      expect(result).toEqual({
         occurrences: [
            {
               date: "2026-03-02",
               start: "09:00",
               end: "11:00",
               source: "weekly",
            },
         ],
      });
   });

   it("lets an empty override hide weekly hours for that date", async () => {
      asCoordinator();
      selectLimit.mockResolvedValue([{ hours: mondayHours }]);
      selectWhereResult = [{ date: "2026-03-02", windows: [] }];

      const result = await listCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         from: "2026-03-01",
         to: "2026-03-07",
      });

      expect(result).toEqual({ occurrences: [] });
   });

   it("rejects a range longer than one year", async () => {
      asCoordinator();

      const result = await listCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         from: "2026-01-01",
         to: "2027-01-03",
      });

      expect(result).toEqual({
         error: "Range cannot be longer than one year",
      });
      expect(select).not.toHaveBeenCalled();
   });
});
