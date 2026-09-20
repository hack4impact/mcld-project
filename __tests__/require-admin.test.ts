/**
 * @jest-environment node
 */
import {
   getUserRole,
   requireAdmin,
   requireCoordinatorOrAdmin,
} from "@/lib/auth/require-admin";
import { ROLES } from "@/lib/roles";

const getClaims = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
   createClient: async () => ({ auth: { getClaims: () => getClaims() } }),
}));

function claiming(userRole: unknown) {
   return { data: { claims: { user_role: userRole } } };
}

beforeEach(() => {
   jest.clearAllMocks();
});

describe("getUserRole", () => {
   it.each([ROLES.ADMIN, ROLES.COORDINATOR, ROLES.USER])(
      "returns the %s role claim",
      async (role) => {
         getClaims.mockResolvedValue(claiming(role));
         await expect(getUserRole()).resolves.toBe(role);
      },
   );

   it("returns null for an unrecognised role claim", async () => {
      getClaims.mockResolvedValue(claiming("coach"));
      await expect(getUserRole()).resolves.toBeNull();
   });

   it("returns null when the role claim is absent", async () => {
      getClaims.mockResolvedValue(claiming(undefined));
      await expect(getUserRole()).resolves.toBeNull();
   });

   it("returns null when there are no claims at all", async () => {
      getClaims.mockResolvedValue({ data: null });
      await expect(getUserRole()).resolves.toBeNull();
   });
});

describe("requireAdmin", () => {
   it("resolves for an admin", async () => {
      getClaims.mockResolvedValue(claiming(ROLES.ADMIN));
      await expect(requireAdmin()).resolves.toBeUndefined();
   });

   it.each([ROLES.COORDINATOR, ROLES.USER])(
      "throws Forbidden for %s",
      async (role) => {
         getClaims.mockResolvedValue(claiming(role));
         await expect(requireAdmin()).rejects.toThrow("Forbidden");
      },
   );

   it("throws Forbidden when unauthenticated", async () => {
      getClaims.mockResolvedValue({ data: null });
      await expect(requireAdmin()).rejects.toThrow("Forbidden");
   });
});

describe("requireCoordinatorOrAdmin", () => {
   it.each([ROLES.ADMIN, ROLES.COORDINATOR])(
      "resolves for %s",
      async (role) => {
         getClaims.mockResolvedValue(claiming(role));
         await expect(requireCoordinatorOrAdmin()).resolves.toBeUndefined();
      },
   );

   it("throws Forbidden for a regular user", async () => {
      getClaims.mockResolvedValue(claiming(ROLES.USER));
      await expect(requireCoordinatorOrAdmin()).rejects.toThrow("Forbidden");
   });

   it("throws Forbidden when unauthenticated", async () => {
      getClaims.mockResolvedValue({ data: null });
      await expect(requireCoordinatorOrAdmin()).rejects.toThrow("Forbidden");
   });
});
