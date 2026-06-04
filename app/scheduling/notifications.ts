import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { getService } from "@/app/(authenticated)/services/queries";
import { appUrl, formatAddress, sendEmail } from "@/lib/email/client";
import {
   clientPickEmail,
   coachInviteEmail,
   confirmationEmail,
} from "@/lib/email/templates";
import { intersectTimeSlots } from "@/lib/scheduling/overlap";
import { generateScheduleToken } from "@/lib/scheduling/token";
import type { TimeSlot } from "@/lib/scheduling/time-slot";

import { getProfileContact } from "./queries";

async function loadSession(sessionId: string) {
   const [session] = await db
      .select()
      .from(coachingSessions)
      .where(eq(coachingSessions.id, sessionId))
      .limit(1);
   return session ?? null;
}

export async function notifyCoachOfBooking(sessionId: string): Promise<void> {
   try {
      const session = await loadSession(sessionId);
      if (!session) return;

      let token = session.coachToken;
      if (!token) {
         token = generateScheduleToken();
         await db
            .update(coachingSessions)
            .set({ coachToken: token })
            .where(eq(coachingSessions.id, sessionId));
      }

      const [coach, client, service] = await Promise.all([
         getProfileContact(session.coachId),
         getProfileContact(session.userId),
         getService(session.serviceId),
      ]);
      if (!coach) {
         console.error(
            "[notifyCoachOfBooking] coach contact missing",
            sessionId,
         );
         return;
      }

      const email = coachInviteEmail({
         coachName: coach.name,
         clientName: client?.name ?? "Your client",
         serviceTitle: service?.title ?? "Private lesson",
         clientSlots: (session.selectedTimeSlots as TimeSlot[]) ?? [],
         url: appUrl(`/scheduling/coach/${token}`),
      });
      await sendEmail({
         to: coach.email,
         replyTo: client ? formatAddress(client.name, client.email) : undefined,
         ...email,
      });
   } catch (e) {
      console.error("[notifyCoachOfBooking]", e);
   }
}

export async function notifyClientToPick(sessionId: string): Promise<void> {
   try {
      const session = await loadSession(sessionId);
      if (!session) return;

      const overlap = intersectTimeSlots(
         (session.selectedTimeSlots as TimeSlot[]) ?? [],
         (session.coachTimeSlots as TimeSlot[] | null) ?? [],
      );
      if (overlap.length === 0) return;

      let token = session.clientToken;
      if (!token) {
         token = generateScheduleToken();
         await db
            .update(coachingSessions)
            .set({ clientToken: token })
            .where(eq(coachingSessions.id, sessionId));
      }

      const [client, coach, service] = await Promise.all([
         getProfileContact(session.userId),
         getProfileContact(session.coachId),
         getService(session.serviceId),
      ]);
      if (!client) {
         console.error(
            "[notifyClientToPick] client contact missing",
            sessionId,
         );
         return;
      }

      const email = clientPickEmail({
         clientName: client.name,
         coachName: coach?.name ?? "Your coach",
         serviceTitle: service?.title ?? "Private lesson",
         overlap,
         url: appUrl(`/scheduling/confirm/${token}`),
      });
      await sendEmail({
         to: client.email,
         replyTo: coach ? formatAddress(coach.name, coach.email) : undefined,
         ...email,
      });
   } catch (e) {
      console.error("[notifyClientToPick]", e);
   }
}

export async function notifyBothConfirmed(
   sessionId: string,
   slot: TimeSlot,
): Promise<void> {
   try {
      const session = await loadSession(sessionId);
      if (!session) return;

      const [client, coach, service] = await Promise.all([
         getProfileContact(session.userId),
         getProfileContact(session.coachId),
         getService(session.serviceId),
      ]);
      const serviceTitle = service?.title ?? "Private lesson";

      if (client && coach) {
         await sendEmail({
            to: client.email,
            replyTo: formatAddress(coach.name, coach.email),
            ...confirmationEmail({
               recipientName: client.name,
               otherPartyName: coach.name,
               serviceTitle,
               slot,
            }),
         });
         await sendEmail({
            to: coach.email,
            replyTo: formatAddress(client.name, client.email),
            ...confirmationEmail({
               recipientName: coach.name,
               otherPartyName: client.name,
               serviceTitle,
               slot,
            }),
         });
      }
   } catch (e) {
      console.error("[notifyBothConfirmed]", e);
   }
}
