/** @jest-environment node */
import { loadCashSessionRegistrations } from "@/lib/cash-session-read-model";
import { listCashSessions, type CashSessionRecord } from "@/lib/cash-sessions";
import { children, profiles, services } from "@/lib/db/schema";
import { renaudCoaching } from "./fixtures/registrations";

const profileLookup = jest.fn();
const tableRows = new Map<unknown, unknown[]>();
const selectedTables: unknown[] = [];
jest.mock("@/lib/db", () => ({
   db: {
      query: {
         profiles: {
            findFirst: (...args: unknown[]) => profileLookup(...args),
         },
      },
      select: () => ({
         from: (table: unknown) => {
            selectedTables.push(table);
            const chain = {
               innerJoin: () => chain,
               where: () => Promise.resolve(tableRows.get(table) ?? []),
            };
            return chain;
         },
      }),
   },
}));
jest.mock("@/lib/cash-sessions", () => ({ listCashSessions: jest.fn() }));
const listCash = jest.mocked(listCashSessions);

const invoice: CashSessionRecord = {
   invoiceId: "in_cash",
   submissionId: "request-1",
   serviceId: renaudCoaching.id,
   userId: "user-1",
   childId: null,
   coordinatorId: "coach-renaud",
   recordedBy: "coach-renaud",
   sessionAt: new Date("2026-09-20T14:00:00Z"),
   collectedAt: new Date("2026-09-20T14:30:00Z"),
   durationMinutes: 30,
   amountCents: 5000,
   currency: "cad",
   title: "Reading lesson",
   createdAt: new Date("2026-09-20T16:00:00Z"),
};

beforeEach(() => {
   jest.clearAllMocks();
   selectedTables.length = 0;
   tableRows.clear();
   profileLookup.mockResolvedValue({ stripeCustomerId: "cus_user1" });
   listCash.mockResolvedValue([invoice]);
   tableRows.set(services, [renaudCoaching]);
   tableRows.set(profiles, [
      {
         id: "user-1",
         firstName: "Pat",
         lastName: "Parent",
         email: "pat@example.com",
      },
   ]);
});

it("scopes customer history to its Stripe customer and metadata user", async () => {
   listCash.mockResolvedValue([
      invoice,
      { ...invoice, invoiceId: "in_other", userId: "other-user" },
   ]);
   const rows = await loadCashSessionRegistrations({ userId: "user-1" });
   expect(listCash).toHaveBeenCalledWith({
      customerId: "cus_user1",
      serviceId: undefined,
   });
   expect(rows.map((row) => row.invoiceId)).toEqual(["in_cash"]);
   expect(rows[0]).toMatchObject({
      durationMinutes: 30,
      profile: { email: "pat@example.com" },
   });
});

it("does not list all Stripe invoices for an account without a customer", async () => {
   profileLookup.mockResolvedValue({ stripeCustomerId: null });
   expect(await loadCashSessionRegistrations({ userId: "user-1" })).toEqual([]);
   expect(listCash).not.toHaveBeenCalled();
});

it("rejects another service and children belonging to another parent", async () => {
   listCash.mockResolvedValue([
      { ...invoice, childId: "child-1" },
      { ...invoice, invoiceId: "in_other_service", serviceId: "other-service" },
   ]);
   tableRows.set(children, [{ id: "child-1", parentId: "other-parent" }]);
   expect(
      await loadCashSessionRegistrations({ serviceId: renaudCoaching.id }),
   ).toEqual([]);
   expect(listCash).toHaveBeenCalledWith({
      customerId: undefined,
      serviceId: renaudCoaching.id,
   });
});

it("hydrates the recorded child without treating them as the parent", async () => {
   listCash.mockResolvedValue([{ ...invoice, childId: "child-1" }]);
   tableRows.set(children, [
      {
         id: "child-1",
         parentId: "user-1",
         firstName: "Sam",
         lastName: "Parent",
      },
   ]);
   const [row] = await loadCashSessionRegistrations({
      serviceId: renaudCoaching.id,
   });
   expect(row.child).toMatchObject({ id: "child-1", firstName: "Sam" });
   expect(selectedTables).toContain(children);
});
