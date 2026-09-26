import type {
   BookingRow,
   SessionRow,
} from "@/app/(authenticated)/registrations/build-registrations";

type ServiceRow = BookingRow["service"];
type ChildRow = NonNullable<BookingRow["child"]>;

export const NOW = new Date("2026-09-26T16:00:00Z");

function service(overrides: Partial<ServiceRow> & Pick<ServiceRow, "id">) {
   return {
      type: "programs",
      startDate: null,
      endDate: null,
      slots: null,
      durationMinutes: 60,
      stripeProductId: `prod_${overrides.id}`,
      status: "active",
      coordinatorId: null,
      formId: null,
      isForChildren: false,
      requiresSubscription: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
   } satisfies ServiceRow;
}

function child(id: string, firstName: string, lastName: string): ChildRow {
   return {
      id,
      firstName,
      lastName,
   } as ChildRow;
}

const lea = child("child-lea", "Léa", "Martin");
const noah = child("child-noah", "Noah", "Martin");

export const fallProgram = service({
   id: "svc-fall",
   startDate: "2026-10-05",
   endDate: "2026-12-14",
   slots: [{ dayOfWeek: 1, time: "17:00" }],
   isForChildren: true,
});

export const summerCamp = service({
   id: "svc-summer",
   startDate: "2026-07-06",
   endDate: "2026-08-28",
   isForChildren: true,
});

export const winterClinic = service({
   id: "svc-winter",
   startDate: "2027-01-10",
   endDate: "2027-02-28",
   status: "archived",
});

export const renaudCoaching = service({
   id: "svc-renaud",
   type: "private_lessons",
   durationMinutes: 45,
   coordinatorId: "coach-renaud",
});

export const pausedLessons = service({
   id: "svc-paused",
   type: "private_lessons",
   status: "disabled",
   coordinatorId: "coach-paused",
});

export const deletedLessons = service({
   id: "svc-deleted",
   type: "private_lessons",
   status: "deleted",
   coordinatorId: "coach-old",
});

export const bookings: BookingRow[] = [
   { service: fallProgram, child: null },
   { service: fallProgram, child: lea },
   { service: summerCamp, child: noah },
   { service: winterClinic, child: null },
];

function session(
   id: string,
   svc: ServiceRow,
   status: SessionRow["status"],
   scheduledAt: string | null,
   createdAt: string,
   forChild: ChildRow | null = null,
): SessionRow {
   return {
      id,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      createdAt: new Date(createdAt),
      service: svc,
      child: forChild,
   };
}

export const sessions: SessionRow[] = [
   session(
      "ses-renaud-done",
      renaudCoaching,
      "completed",
      "2026-09-12T14:00:00Z",
      "2026-09-01T12:00:00Z",
   ),
   session(
      "ses-renaud-oct3",
      renaudCoaching,
      "confirmed",
      "2026-10-03T14:00:00Z",
      "2026-09-20T12:00:00Z",
   ),
   session(
      "ses-renaud-oct10",
      renaudCoaching,
      "confirmed",
      "2026-10-10T14:00:00Z",
      "2026-09-22T12:00:00Z",
   ),
   session(
      "ses-renaud-unscheduled",
      renaudCoaching,
      "pending",
      null,
      "2026-09-24T12:00:00Z",
      lea,
   ),
   session(
      "ses-paused",
      pausedLessons,
      "confirmed",
      "2026-09-19T14:00:00Z",
      "2026-09-10T12:00:00Z",
   ),
   session(
      "ses-deleted",
      deletedLessons,
      "confirmed",
      "2026-10-20T14:00:00Z",
      "2026-09-05T12:00:00Z",
   ),
   session(
      "ses-cancelled",
      renaudCoaching,
      "cancelled",
      "2026-10-17T14:00:00Z",
      "2026-09-25T12:00:00Z",
   ),
];

export const titles = new Map<string, string | null>([
   ["svc-fall", "Fall hockey program"],
   ["svc-summer", "Summer camp"],
   ["svc-winter", "Winter clinic"],
   ["svc-renaud", "Renaud coaching"],
]);
