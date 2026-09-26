import type { ProgramSchedule } from "@/app/(authenticated)/services/actions";
import type { ServiceStatus } from "@/app/(authenticated)/services/queries";
import type { children, coachingSessions, services } from "@/lib/db/schema";

export const DISPLAY_TIME_ZONE = "America/Toronto";

const HIDDEN_SERVICE_STATUSES: ServiceStatus[] = ["archived", "deleted"];

export type RegisteredChild = {
   id: string;
   firstName: string;
   lastName: string;
};

export type Participants = {
   self: boolean;
   children: RegisteredChild[];
};

export type RegistrationTiming = "upcoming" | "past";

export type LessonStatus = "pending" | "confirmed" | "completed";

type RegistrationBase = {
   id: string;
   serviceId: string;
   title: string | null;
   serviceStatus: ServiceStatus;
   timing: RegistrationTiming;
   durationMinutes: number;
   participants: Participants;
};

export type ProgramRegistration = RegistrationBase & {
   type: "programs";
   schedule: ProgramSchedule | null;
};

export type PrivateLessonRegistration = RegistrationBase & {
   type: "private_lessons";
   lessonStatus: LessonStatus;
   lessonNumber: number | null;
   scheduledLabel: string | null;
   bookedAtLabel: string;
};

export type RegistrationView = ProgramRegistration | PrivateLessonRegistration;

export type Registrations = {
   upcoming: RegistrationView[];
   past: RegistrationView[];
};

type ServiceRow = typeof services.$inferSelect;
type ChildRow = typeof children.$inferSelect;

export type BookingRow = { service: ServiceRow; child: ChildRow | null };

export type SessionRow = {
   id: string;
   status: (typeof coachingSessions.$inferSelect)["status"];
   scheduledAt: Date | null;
   createdAt: Date;
   service: ServiceRow;
   child: ChildRow | null;
};

type Sortable = {
   view: RegistrationView;
   at: number | null;
   tiebreak: number;
};

function ymdInZone(date: Date): string {
   return new Intl.DateTimeFormat("en-CA", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
   }).format(date);
}

function formatLessonTime(date: Date): string {
   return new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
   }).format(date);
}

function formatBookedAt(date: Date): string {
   return new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
   }).format(date);
}

function isVisible({ service }: { service: ServiceRow }): boolean {
   return !HIDDEN_SERVICE_STATUSES.includes(service.status);
}

function scheduleFromService(row: ServiceRow): ProgramSchedule | null {
   if (!row.startDate || !row.endDate) return null;
   return {
      startDate: row.startDate,
      endDate: row.endDate,
      slots: row.slots ?? [],
   };
}

function toChild(row: ChildRow): RegisteredChild {
   return { id: row.id, firstName: row.firstName, lastName: row.lastName };
}

function isLessonStatus(status: SessionRow["status"]): status is LessonStatus {
   return (
      status === "pending" || status === "confirmed" || status === "completed"
   );
}

function compareAt(a: Sortable, b: Sortable, direction: 1 | -1): number {
   if (a.at !== null && b.at !== null && a.at !== b.at) {
      return (a.at - b.at) * direction;
   }
   if (a.at !== null && b.at === null) return -1;
   if (a.at === null && b.at !== null) return 1;
   return a.tiebreak - b.tiebreak;
}

function buildPrograms(bookings: BookingRow[], today: string): Sortable[] {
   const groups = new Map<
      string,
      { service: ServiceRow; self: boolean; childRows: ChildRow[] }
   >();

   for (const { service, child } of bookings) {
      let group = groups.get(service.id);
      if (!group) {
         group = { service, self: false, childRows: [] };
         groups.set(service.id, group);
      }
      if (!child) group.self = true;
      else if (!group.childRows.some((c) => c.id === child.id)) {
         group.childRows.push(child);
      }
   }

   return Array.from(groups.values()).map(({ service, self, childRows }) => {
      const schedule = scheduleFromService(service);
      const timing: RegistrationTiming =
         schedule && schedule.endDate < today ? "past" : "upcoming";
      const sortDate =
         timing === "past" ? schedule?.endDate : schedule?.startDate;

      return {
         view: {
            id: service.id,
            serviceId: service.id,
            type: "programs",
            title: null,
            serviceStatus: service.status,
            timing,
            durationMinutes: service.durationMinutes,
            participants: { self, children: childRows.map(toChild) },
            schedule,
         },
         at: sortDate ? Date.parse(sortDate) : null,
         tiebreak: service.createdAt.getTime(),
      };
   });
}

function buildLessons(sessions: SessionRow[], now: Date): Sortable[] {
   const lessons = sessions
      .filter((row) => isLessonStatus(row.status))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

   const perService = new Map<string, number>();
   for (const row of lessons) {
      perService.set(row.service.id, (perService.get(row.service.id) ?? 0) + 1);
   }
   const seen = new Map<string, number>();

   return lessons.map((row) => {
      const lessonStatus = row.status as LessonStatus;
      const number = (seen.get(row.service.id) ?? 0) + 1;
      seen.set(row.service.id, number);

      const endsAt = row.scheduledAt
         ? row.scheduledAt.getTime() + row.service.durationMinutes * 60_000
         : null;
      const timing: RegistrationTiming =
         lessonStatus === "completed" ||
         (endsAt !== null && endsAt <= now.getTime())
            ? "past"
            : "upcoming";

      return {
         view: {
            id: row.id,
            serviceId: row.service.id,
            type: "private_lessons",
            title: null,
            serviceStatus: row.service.status,
            timing,
            durationMinutes: row.service.durationMinutes,
            participants: row.child
               ? { self: false, children: [toChild(row.child)] }
               : { self: true, children: [] },
            lessonStatus,
            lessonNumber:
               (perService.get(row.service.id) ?? 0) > 1 ? number : null,
            scheduledLabel: row.scheduledAt
               ? formatLessonTime(row.scheduledAt)
               : null,
            bookedAtLabel: formatBookedAt(row.createdAt),
         },
         at: row.scheduledAt?.getTime() ?? null,
         tiebreak: row.createdAt.getTime(),
      };
   });
}

export function buildRegistrations({
   bookings,
   sessions,
   titles,
   now,
}: {
   bookings: BookingRow[];
   sessions: SessionRow[];
   titles: Map<string, string | null>;
   now: Date;
}): Registrations {
   const all = [
      ...buildPrograms(bookings.filter(isVisible), ymdInZone(now)),
      ...buildLessons(sessions.filter(isVisible), now),
   ];
   for (const item of all) {
      item.view.title = titles.get(item.view.serviceId) ?? null;
   }

   return {
      upcoming: all
         .filter((item) => item.view.timing === "upcoming")
         .sort((a, b) => compareAt(a, b, 1))
         .map((item) => item.view),
      past: all
         .filter((item) => item.view.timing === "past")
         .sort((a, b) => compareAt(a, b, -1))
         .map((item) => item.view),
   };
}
