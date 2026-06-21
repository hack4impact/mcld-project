/**
 * @jest-environment node
 */
import { deleteUserAdmin } from "@/app/(authenticated)/users/actions";

// db mock
const selectLimit = jest.fn();
const selectWhere = jest.fn(() => ({ limit: selectLimit }));
const selectFrom = jest.fn(() => ({ where: selectWhere }));
const select = jest.fn(() => ({ from: selectFrom })) as jest.Mock;

jest.mock("@/lib/db", () => ({
   db: {
      select: (...args: unknown[]) => select(...args),
   },
}));

// supabase admin mock
const deleteUser = jest.fn();
jest.mock("@/utils/supabase/admin", () => ({
   createAdminClient: () => ({
      auth: { admin: { deleteUser: (...args: unknown[]) => deleteUser(...args) } },
   }),
}));

// auth + cache + stripe mocks
const requireAdmin = jest.fn();
jest.mock("@/lib/auth/require-admin", () => ({
   requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

// actions.ts imports grantComplimentarySubscription from @/lib/stripe, which
// instantiates the Stripe client at module load.
jest.mock("@/lib/stripe", () => ({
   grantComplimentarySubscription: jest.fn(),
}));

const COORDINATOR_ID = "11111111-1111-1111-1111-111111111111";

function fd(obj: Record<string, string>): FormData {
   const f = new FormData();
   for (const [k, v] of Object.entries(obj)) f.append(k, v);
   return f;
}

beforeEach(() => {
   jest.clearAllMocks();
   requireAdmin.mockResolvedValue(undefined);
   selectLimit.mockResolvedValue([]);
   deleteUser.mockResolvedValue({ error: null });
});

describe("deleteUserAdmin", () => {
   it("returns Unauthorized when the caller is not an admin", async () => {
      requireAdmin.mockRejectedValue(new Error("Forbidden"));

      const result = await deleteUserAdmin(null, fd({ user_id: COORDINATOR_ID }));

      expect(result).toEqual({ errors: { _form: ["Unauthorized"] } });
      expect(deleteUser).not.toHaveBeenCalled();
   });

   it("blocks deletion when the coordinator is assigned to a private lesson", async () => {
      selectLimit.mockResolvedValue([{ id: "svc-1" }]);

      const result = await deleteUserAdmin(null, fd({ user_id: COORDINATOR_ID }));

      expect(result?.errors?._form?.[0]).toMatch(/private lesson/i);
      expect(deleteUser).not.toHaveBeenCalled();
   });

   it("deletes the user when not assigned to any private lesson", async () => {
      selectLimit.mockResolvedValue([]);

      const result = await deleteUserAdmin(null, fd({ user_id: COORDINATOR_ID }));

      expect(result).toEqual({ message: "User deleted." });
      expect(deleteUser).toHaveBeenCalledWith(COORDINATOR_ID);
   });

   it("surfaces an auth error from Supabase", async () => {
      deleteUser.mockResolvedValue({ error: { message: "boom" } });

      const result = await deleteUserAdmin(null, fd({ user_id: COORDINATOR_ID }));

      expect(result).toEqual({ errors: { _form: ["boom"] } });
   });
});
