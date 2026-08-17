/**
 * @jest-environment node
 */
import { updateCoordinatorAvailability } from "@/app/coaching/actions";

const COORDINATOR_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_COORDINATOR_ID = "22222222-2222-2222-2222-222222222222";
const ADMIN_ID = "33333333-3333-3333-3333-333333333333";

const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
const insertValues = jest.fn(() => ({ onConflictDoUpdate }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;

jest.mock("@/lib/db", () => ({
   db: {
      insert: (...args: unknown[]) => insert(...args),
   },
}));

const getUser = jest.fn();
const getClaims = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser, getClaims } }),
}));

const emptyWeek = {
   0: [],
   1: [],
   2: [],
   3: [],
   4: [],
   5: [],
   6: [],
};

beforeEach(() => {
   jest.clearAllMocks();
});

describe("updateCoordinatorAvailability", () => {
   it("returns Unauthorized when not signed in", async () => {
      getUser.mockResolvedValue({ data: { user: null } });
      getClaims.mockResolvedValue({ data: { claims: null } });

      const result = await updateCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         slots: emptyWeek,
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

      const result = await updateCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         slots: emptyWeek,
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("lets a coordinator save their own slots", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: COORDINATOR_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "coordinator" } },
      });

      const result = await updateCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         slots: emptyWeek,
      });

      expect(result).toEqual({ ok: true });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ coordinatorId: COORDINATOR_ID }),
      );
   });

   it("blocks a coordinator from saving another coordinator's slots", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: COORDINATOR_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "coordinator" } },
      });

      const result = await updateCoordinatorAvailability({
         coordinatorId: OTHER_COORDINATOR_ID,
         slots: emptyWeek,
      });

      expect(result).toEqual({ error: "Unauthorized" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("lets an admin save any coordinator's slots", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: ADMIN_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "admin" } },
      });

      const result = await updateCoordinatorAvailability({
         coordinatorId: OTHER_COORDINATOR_ID,
         slots: emptyWeek,
      });

      expect(result).toEqual({ ok: true });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ coordinatorId: OTHER_COORDINATOR_ID }),
      );
   });

   it("rejects overlapping slots on the same day", async () => {
      getUser.mockResolvedValue({
         data: { user: { id: COORDINATOR_ID } },
      });
      getClaims.mockResolvedValue({
         data: { claims: { user_role: "coordinator" } },
      });

      const result = await updateCoordinatorAvailability({
         coordinatorId: COORDINATOR_ID,
         slots: {
            ...emptyWeek,
            1: [
               { time: "10:00", durationMinutes: 60 },
               { time: "10:30", durationMinutes: 60 },
            ],
         },
      });

      expect(result).toEqual({
         error: "Slots on the same day must not overlap",
      });
      expect(insert).not.toHaveBeenCalled();
   });
});
