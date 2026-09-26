/** @jest-environment node */
import { listRegistrationsForUser } from "@/app/(authenticated)/registrations/queries";
import { listServiceRegistrations } from "@/app/(authenticated)/services/queries";
import { getServiceRegistrations } from "@/app/(authenticated)/services/[id]/queries";
import {
   loadCashSessionRegistrations,
   type CashSessionRegistration,
} from "@/lib/cash-session-read-model";
import { privateLessonSessions, serviceBookings } from "@/lib/db/schema";
import { renaudCoaching } from "./fixtures/registrations";

const select = jest.fn();
let selectResults: unknown[][] = [];
const selectedTables: unknown[] = [];
jest.mock("@/lib/db", () => ({
   db: { select: (...args: unknown[]) => select(...args) },
}));
jest.mock("@/lib/stripe", () => ({
   getStripeServiceData: jest.fn(async () => ({
      title: "Current service title",
   })),
}));
jest.mock("next/cache", () => ({ cacheTag: jest.fn() }));
jest.mock("@/lib/cash-sessions", () => ({ listCashSessions: jest.fn() }));
jest.mock("@/lib/cash-session-read-model", () => ({
   ...jest.requireActual("@/lib/cash-session-read-model"),
   loadCashSessionRegistrations: jest.fn(),
}));
const loadCash = jest.mocked(loadCashSessionRegistrations);
const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const service = { ...renaudCoaching, id: SERVICE_ID };
const invoice: CashSessionRegistration = {
   invoiceId: "in_cash",
   submissionId: "request-1",
   serviceId: SERVICE_ID,
   userId: "user-1",
   childId: null,
   coordinatorId: "coach-1",
   recordedBy: "coach-1",
   sessionAt: new Date("2026-09-20T14:00:00Z"),
   collectedAt: new Date("2026-09-20T14:30:00Z"),
   durationMinutes: 30,
   amountCents: 5000,
   currency: "cad",
   title: "Original lesson title",
   createdAt: new Date("2026-09-20T16:00:00Z"),
   service,
   profile: {
      id: "user-1",
      firstName: "Pat",
      lastName: "Parent",
      email: "pat@example.com",
   },
   child: null,
};

beforeEach(() => {
   jest.clearAllMocks();
   selectedTables.length = 0;
   selectResults = [];
   select.mockImplementation(() => {
      const rows = selectResults.shift() ?? [];
      const chain = {
         from: (table: unknown) => {
            selectedTables.push(table);
            return chain;
         },
         innerJoin: () => chain,
         leftJoin: () => chain,
         where: () => chain,
         limit: () => chain,
         orderBy: () => chain,
         then: (
            resolve: (value: unknown[]) => unknown,
            reject: (reason: unknown) => unknown,
         ) => Promise.resolve(rows).then(resolve, reject),
      };
      return chain;
   });
   loadCash.mockResolvedValue([invoice]);
});

it("merges invoice-only customer history with real duration and deduplicates legacy rows", async () => {
   const local = {
      id: "local-new",
      status: "completed",
      scheduledAt: invoice.sessionAt,
      createdAt: invoice.createdAt,
      stripeOrderId: "in_cash",
      service,
      child: null,
   };
   selectResults = [
      [],
      [local, { ...local, id: "legacy-old", stripeOrderId: "in_old" }],
   ];
   const { past } = await listRegistrationsForUser("user-1");
   expect(loadCash).toHaveBeenCalledWith({ userId: "user-1" });
   expect(past.map((row) => row.id).sort()).toEqual(["in_cash", "legacy-old"]);
   expect(past.find((row) => row.id === "in_cash")).toMatchObject({
      title: "Original lesson title",
      durationMinutes: 30,
      paidInCash: true,
      lessonStatus: "completed",
      scheduledLabel: expect.stringContaining("10:00"),
   });
   expect(past.find((row) => row.id === "legacy-old")).toMatchObject({
      durationMinutes: 45,
      paidInCash: true,
   });
});

it("shows cash-only children in coordinator registrations with session details", async () => {
   loadCash.mockResolvedValue([
      {
         ...invoice,
         childId: "child-1",
         child: {
            id: "child-1",
            firstName: "Sam",
            lastName: "Parent",
            parentId: "user-1",
         } as NonNullable<CashSessionRegistration["child"]>,
      },
   ]);
   selectResults = [[{ type: "private_lessons", formId: null }], []];
   const rows = await listServiceRegistrations(SERVICE_ID);
   expect(rows).toEqual([
      expect.objectContaining({
         bookingId: "in_cash",
         registrantName: "Sam Parent",
         isChild: true,
         status: "completed",
         paidInCash: true,
         cashDetails: {
            sessionAt: invoice.sessionAt,
            durationMinutes: 30,
            amountCents: 5000,
            currency: "cad",
         },
      }),
   ]);
});

it("merges cash with admin adult history using the private-lesson table", async () => {
   const local = {
      bookingId: "local-new",
      status: "completed",
      registeredAt: invoice.createdAt,
      stripeOrderId: "in_cash",
      profileId: "user-1",
      firstName: "Pat",
      lastName: "Parent",
      email: "pat@example.com",
   };
   selectResults = [
      [{ type: "private_lessons", isForChildren: false, formId: null }],
      [local, { ...local, bookingId: "old-cash", stripeOrderId: "in_old" }],
   ];
   const result = await getServiceRegistrations(SERVICE_ID);
   expect(selectedTables).toContain(privateLessonSessions);
   expect(selectedTables).not.toContain(serviceBookings);
   expect(result.registrations.map((row) => row.bookingId).sort()).toEqual([
      "in_cash",
      "old-cash",
   ]);
   expect(
      result.registrations.find((row) => row.bookingId === "in_cash"),
   ).toMatchObject({ paidInCash: true, cashDetails: { durationMinutes: 30 } });
});

it("keeps child profile/contact/form details in admin invoice-only history", async () => {
   loadCash.mockResolvedValue([
      {
         ...invoice,
         childId: "child-1",
         child: {
            id: "child-1",
            firstName: "Sam",
            lastName: "Parent",
            parentId: "user-1",
            dob: "2018-05-01",
            gender: "prefer_not_to_say",
            allergies: "Peanuts",
            medicalConditions: null,
            medications: null,
         } as NonNullable<CashSessionRegistration["child"]>,
      },
   ]);
   selectResults = [
      [{ type: "private_lessons", isForChildren: true, formId: "form-1" }],
      [],
      [
         {
            childId: "child-1",
            fullName: "Pat Parent",
            phoneNumber: "5145550100",
            emailAddress: "pat@example.com",
            relationship: "Parent",
         },
      ],
      [{ childId: "child-1", prompt: "Experience?", answer: ["Beginner"] }],
   ];
   const result = await getServiceRegistrations(SERVICE_ID);
   expect(result).toMatchObject({
      kind: "kid",
      registrations: [
         {
            bookingId: "in_cash",
            status: "completed",
            paidInCash: true,
            child: {
               firstName: "Sam",
               allergies: "Peanuts",
               emergencyContacts: [{ fullName: "Pat Parent" }],
            },
            parent: { email: "pat@example.com" },
            formAnswers: [{ prompt: "Experience?", answer: ["Beginner"] }],
            cashDetails: { durationMinutes: 30 },
         },
      ],
   });
});

it("leaves program registration reads independent of cash invoices", async () => {
   selectResults = [
      [{ type: "programs", isForChildren: false, formId: null }],
      [],
   ];
   expect(await getServiceRegistrations(SERVICE_ID)).toEqual({
      kind: "adult",
      registrations: [],
   });
   expect(selectedTables).toContain(serviceBookings);
   expect(loadCash).not.toHaveBeenCalled();
});
