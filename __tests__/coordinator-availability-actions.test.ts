/**
 * @jest-environment node
 */
import { updateCoordinatorAvailability } from "@/app/coaching/actions";

const COORDINATOR_ID = "11111111-1111-1111-1111-111111111111";

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
});