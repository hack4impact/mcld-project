/**
 * @jest-environment node
 */
import { submitAvailabilities } from "@/app/private-lessons/actions";

const SERVICE_ID = "11111111-1111-1111-1111-111111111111";
const COORDINATOR_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "33333333-3333-3333-3333-333333333333";

const insertReturning = jest.fn();
const insertValues = jest.fn(() => ({ returning: insertReturning }));
const insert = jest.fn(() => ({ values: insertValues })) as jest.Mock;
const findService = jest.fn();

jest.mock("@/lib/db", () => ({
   db: {
      insert: (...args: unknown[]) => insert(...args),
      query: {
         services: { findFirst: (...args: unknown[]) => findService(...args) },
      },
   },
}));

const getUser = jest.fn();
jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getUser } }),
}));

const window = {
   start: "2026-10-05T13:00:00.000Z",
   end: "2026-10-05T15:00:00.000Z",
};

function privateLesson(isScheduled: boolean) {
   return {
      id: SERVICE_ID,
      type: "private_lessons",
      status: "active",
      coordinatorId: COORDINATOR_ID,
      isScheduled,
   };
}

beforeEach(() => {
   jest.clearAllMocks();
   getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
   insertReturning.mockResolvedValue([{ id: "session-1" }]);
});

describe("submitAvailabilities — non-scheduled lessons", () => {
   it("creates a session without any windows", async () => {
      findService.mockResolvedValue(privateLesson(false));

      const result = await submitAvailabilities({ serviceId: SERVICE_ID });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
      expect(insertValues).toHaveBeenCalledWith({
         userId: USER_ID,
         serviceId: SERVICE_ID,
         coordinatorId: COORDINATOR_ID,
         selectedTimeSlots: null,
         status: "awaiting_payment",
      });
   });

   it("ignores windows sent for a non-scheduled lesson", async () => {
      findService.mockResolvedValue(privateLesson(false));

      await submitAvailabilities({
         serviceId: SERVICE_ID,
         availabilities: [window],
      });

      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ selectedTimeSlots: null }),
      );
   });
});

describe("submitAvailabilities — scheduled lessons", () => {
   it("still requires at least one window", async () => {
      findService.mockResolvedValue(privateLesson(true));

      const result = await submitAvailabilities({
         serviceId: SERVICE_ID,
         availabilities: [],
      });

      expect(result).toEqual({
         error: "At least one availability window is required",
      });
      expect(insert).not.toHaveBeenCalled();
   });

   it("stores the customer's windows", async () => {
      findService.mockResolvedValue(privateLesson(true));

      const result = await submitAvailabilities({
         serviceId: SERVICE_ID,
         availabilities: [window],
      });

      expect(result).toEqual({ privateLessonSessionId: "session-1" });
      expect(insertValues).toHaveBeenCalledWith(
         expect.objectContaining({ selectedTimeSlots: [window] }),
      );
   });
});

describe("submitAvailabilities — guards", () => {
   it("requires a signed-in user", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      const result = await submitAvailabilities({ serviceId: SERVICE_ID });

      expect(result).toEqual({ error: "Not authenticated" });
      expect(insert).not.toHaveBeenCalled();
   });

   it("rejects a program", async () => {
      findService.mockResolvedValue({
         ...privateLesson(false),
         type: "programs",
      });

      const result = await submitAvailabilities({ serviceId: SERVICE_ID });

      expect(result).toEqual({ error: "Service is not a private lesson" });
      expect(insert).not.toHaveBeenCalled();
   });
});
