import "server-only";

import { eq, or } from "drizzle-orm";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { coachingSessions, profiles } from "@/lib/db/schema";
import { getService } from "@/app/(authenticated)/services/queries";
import { intersectTimeSlots } from "@/lib/scheduling/overlap";
import type { TimeSlot } from "@/lib/scheduling/time-slot";

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

export type ProfileContact = { name: string; email: string };
export type CoachScheduleView = {
   role: "coach";
   sessionId: string;
   status: string;
   serviceTitle: string;
   coachName: string;
   clientName: string;
   clientSlots: TimeSlot[];
   coachSlots: TimeSlot[];
};

export type ClientScheduleView = {
   role: "client";
   sessionId: string;
   status: string;
   serviceTitle: string;
   coachName: string;
   overlap: TimeSlot[];
   durationMinutes: number;
   scheduledAt: string | null;
};

export async function getProfileContact(
   profileId: string,
): Promise<ProfileContact | null> {
   const [row] = await db
      .select({
         firstName: profiles.firstName,
         lastName: profiles.lastName,
         email: authUsers.email,
      })
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .where(eq(profiles.id, profileId))
      .limit(1);

   if (!row || !row.email) return null;
   return { name: `${row.firstName} ${row.lastName}`.trim(), email: row.email };
}

export type ScheduleView = CoachScheduleView | ClientScheduleView;

export async function getSessionByToken(
   token: string,
): Promise<ScheduleView | null> {
   if (!token) return null;

   const [session] = await db
      .select()
      .from(coachingSessions)
      .where(
         or(
            eq(coachingSessions.coachToken, token),
            eq(coachingSessions.clientToken, token),
         ),
      )
      .limit(1);

   if (!session) return null;

   const service = await getService(session.serviceId);
   const serviceTitle = service?.title ?? "Private lesson";
   const clientSlots = (session.selectedTimeSlots as TimeSlot[]) ?? [];
   const coachSlots = (session.coachTimeSlots as TimeSlot[] | null) ?? [];

   if (session.coachToken === token) {
      const [clientContact, coachContact] = await Promise.all([
         getProfileContact(session.userId),
         getProfileContact(session.coachId),
      ]);
      return {
         role: "coach",
         sessionId: session.id,
         status: session.status,
         serviceTitle,
         coachName: coachContact?.name ?? "Coach",
         clientName: clientContact?.name ?? "Your client",
         clientSlots,
         coachSlots,
      };
   }

   const contact = await getProfileContact(session.coachId);
   return {
      role: "client",
      sessionId: session.id,
      status: session.status,
      serviceTitle,
      coachName: contact?.name ?? "Your coach",
      overlap: intersectTimeSlots(clientSlots, coachSlots),
      durationMinutes: service?.durationMinutes ?? 60,
      scheduledAt: session.scheduledAt
         ? session.scheduledAt.toISOString()
         : null,
   };
}
