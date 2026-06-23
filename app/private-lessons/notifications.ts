import "server-only";

import { asc, eq } from "drizzle-orm";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import {
   children,
   privateLessonSessions,
   emergencyContacts,
   formQuestionAnswers,
   formQuestions,
   profiles,
} from "@/lib/db/schema";
import { getService } from "@/app/(authenticated)/services/queries";
import { sendEmail } from "@/lib/email/client";
import { coordinatorBookingEmail, type ChildInfo } from "@/lib/email/templates";
import { userHasActiveSubscription } from "@/lib/stripe";
import type { TimeSlot } from "@/lib/scheduling/time-slot";

const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

type ProfileWithEmail = {
   firstName: string;
   lastName: string;
   email: string | null;
   address: string | null;
   gender: string | null;
   dob: string | null;
   phone: string | null;
};

async function getProfileWithEmail(
   profileId: string,
): Promise<ProfileWithEmail | null> {
   const [row] = await db
      .select({
         firstName: profiles.firstName,
         lastName: profiles.lastName,
         email: authUsers.email,
         address: profiles.address,
         gender: profiles.gender,
         dob: profiles.dob,
         phone: profiles.phone,
      })
      .from(profiles)
      .innerJoin(authUsers, eq(authUsers.id, profiles.id))
      .where(eq(profiles.id, profileId))
      .limit(1);
   return row ?? null;
}

async function loadChildInfo(childId: string): Promise<ChildInfo | null> {
   const [child] = await db
      .select()
      .from(children)
      .where(eq(children.id, childId))
      .limit(1);
   if (!child) return null;

   const contacts = await db
      .select({
         fullName: emergencyContacts.fullName,
         relationship: emergencyContacts.relationship,
         phoneNumber: emergencyContacts.phoneNumber,
         emailAddress: emergencyContacts.emailAddress,
      })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.childId, childId));

   const answers = await db
      .select({
         prompt: formQuestions.prompt,
         answer: formQuestionAnswers.answer,
         sortOrder: formQuestions.sortOrder,
      })
      .from(formQuestionAnswers)
      .innerJoin(
         formQuestions,
         eq(formQuestions.id, formQuestionAnswers.formQuestionId),
      )
      .where(eq(formQuestionAnswers.childId, childId))
      .orderBy(asc(formQuestions.sortOrder));

   return {
      firstName: child.firstName,
      lastName: child.lastName,
      dob: child.dob,
      gender: child.gender,
      allergies: child.allergies,
      medicalConditions: child.medicalConditions,
      medications: child.medications,
      emergencyContacts: contacts,
      formAnswers: answers.map((a) => ({ prompt: a.prompt, answer: a.answer })),
   };
}

export async function sendCoordinatorBookingEmail(
   sessionId: string,
): Promise<void> {
   try {
      const [session] = await db
         .select()
         .from(privateLessonSessions)
         .where(eq(privateLessonSessions.id, sessionId))
         .limit(1);
      if (!session) {
         console.error(
            "[sendCoordinatorBookingEmail] session missing",
            sessionId,
         );
         return;
      }

      const [coordinator, client, service, hasActiveSubscription] =
         await Promise.all([
            getProfileWithEmail(session.coordinatorId),
            getProfileWithEmail(session.userId),
            getService(session.serviceId),
            userHasActiveSubscription(session.userId),
         ]);

      if (!coordinator?.email) {
         console.error(
            "[sendCoordinatorBookingEmail] coordinator email missing",
            sessionId,
         );
         return;
      }
      if (!client) {
         console.error(
            "[sendCoordinatorBookingEmail] client profile missing",
            sessionId,
         );
         return;
      }

      const serviceTitle = service?.title ?? "Private lesson";
      const durationMinutes = service?.durationMinutes ?? 60;

      let scheduledSlot: TimeSlot | null = null;
      if (session.scheduledAt) {
         const start = session.scheduledAt;
         const end = new Date(start.getTime() + durationMinutes * 60_000);
         scheduledSlot = { start: start.toISOString(), end: end.toISOString() };
      }

      const child = session.childId
         ? await loadChildInfo(session.childId)
         : null;

      const email = await coordinatorBookingEmail({
         coordinatorName:
            `${coordinator.firstName} ${coordinator.lastName}`.trim(),
         serviceTitle,
         client: {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email ?? "—",
            address: client.address,
            gender: client.gender,
            dob: client.dob,
            phone: client.phone,
            hasActiveSubscription,
         },
         scheduledSlot,
         requestedAvailability:
            (session.selectedTimeSlots as TimeSlot[] | null) ?? [],
         notes: session.notes,
         child,
      });

      await sendEmail({ to: coordinator.email, ...email });
   } catch (e) {
      console.error("[sendCoordinatorBookingEmail]", e);
   }
}
