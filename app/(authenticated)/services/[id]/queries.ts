import { cacheTag } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import {
   children,
   emergencyContacts,
   formQuestionAnswers,
   formQuestions,
   profiles,
   serviceBookings,
   services,
} from "@/lib/db/schema";

const auth = pgSchema("auth");
const authUsers = auth.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

const SERVICES_TAG = "services";

export type AdultRegistration = {
   bookingId: string;
   status: string;
   registeredAt: Date;
   profile: { id: string; firstName: string; lastName: string; email: string };
};

export type KidRegistration = {
   bookingId: string;
   status: string;
   registeredAt: Date;
   child: {
      id: string;
      firstName: string;
      lastName: string;
      dob: string;
      gender: string;
      allergies: string | null;
      medicalConditions: string | null;
      medications: string | null;
      emergencyContacts: {
         fullName: string;
         emailAddress: string;
         phoneNumber: string;
         relationship: string;
      }[];
   };
   parent: { firstName: string; lastName: string; email: string };
   formAnswers: { prompt: string; answer: string[] }[];
};

export type ServiceRegistrations =
   | { kind: "adult"; registrations: AdultRegistration[] }
   | { kind: "kid"; registrations: KidRegistration[] };

export async function getServiceRegistrations(
   serviceId: string,
): Promise<ServiceRegistrations> {
   "use cache";
   cacheTag(SERVICES_TAG);

   const [service] = await db
      .select({ isForChildren: services.isForChildren, formId: services.formId })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

   if (!service) return { kind: "adult", registrations: [] };

   if (!service.isForChildren) {
      const rows = await db
         .select({
            bookingId: serviceBookings.id,
            status: serviceBookings.status,
            registeredAt: serviceBookings.createdAt,
            profileId: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            email: authUsers.email,
         })
         .from(serviceBookings)
         .innerJoin(profiles, eq(profiles.id, serviceBookings.userId))
         .innerJoin(authUsers, eq(authUsers.id, serviceBookings.userId))
         .where(eq(serviceBookings.serviceId, serviceId));

      return {
         kind: "adult",
         registrations: rows.map((r) => ({
            bookingId: r.bookingId,
            status: r.status,
            registeredAt: r.registeredAt,
            profile: {
               id: r.profileId,
               firstName: r.firstName,
               lastName: r.lastName,
               email: r.email ?? "",
            },
         })),
      };
   }

   // Kid service: bookings link to a child via childId
   const bookingRows = await db
      .select({
         bookingId: serviceBookings.id,
         status: serviceBookings.status,
         registeredAt: serviceBookings.createdAt,
         childId: children.id,
         childFirstName: children.firstName,
         childLastName: children.lastName,
         childDob: children.dob,
         childGender: children.gender,
         childAllergies: children.allergies,
         childMedicalConditions: children.medicalConditions,
         childMedications: children.medications,
         parentFirstName: profiles.firstName,
         parentLastName: profiles.lastName,
         parentEmail: authUsers.email,
      })
      .from(serviceBookings)
      .innerJoin(children, eq(children.id, serviceBookings.childId))
      .innerJoin(profiles, eq(profiles.id, children.parentId))
      .innerJoin(authUsers, eq(authUsers.id, children.parentId))
      .where(eq(serviceBookings.serviceId, serviceId));

   if (bookingRows.length === 0) return { kind: "kid", registrations: [] };

   const childIds = [...new Set(bookingRows.map((r) => r.childId))];

   const contactRows = await db
      .select({
         childId: emergencyContacts.childId,
         fullName: emergencyContacts.fullName,
         emailAddress: emergencyContacts.emailAddress,
         phoneNumber: emergencyContacts.phoneNumber,
         relationship: emergencyContacts.relationship,
      })
      .from(emergencyContacts)
      .where(inArray(emergencyContacts.childId, childIds));

   const contactsByChild = new Map<
      string,
      { fullName: string; emailAddress: string; phoneNumber: string; relationship: string }[]
   >();
   for (const c of contactRows) {
      const list = contactsByChild.get(c.childId) ?? [];
      list.push(c);
      contactsByChild.set(c.childId, list);
   }

   const answersByChild = new Map<string, { prompt: string; answer: string[] }[]>();
   if (service.formId) {
      const answerRows = await db
         .select({
            childId: formQuestionAnswers.childId,
            prompt: formQuestions.prompt,
            answer: formQuestionAnswers.answer,
         })
         .from(formQuestionAnswers)
         .innerJoin(
            formQuestions,
            eq(formQuestions.id, formQuestionAnswers.formQuestionId),
         )
         .where(eq(formQuestions.formId, service.formId));

      for (const a of answerRows) {
         if (!childIds.includes(a.childId)) continue;
         const list = answersByChild.get(a.childId) ?? [];
         list.push({ prompt: a.prompt, answer: a.answer });
         answersByChild.set(a.childId, list);
      }
   }

   return {
      kind: "kid",
      registrations: bookingRows.map((r) => ({
         bookingId: r.bookingId,
         status: r.status,
         registeredAt: r.registeredAt,
         child: {
            id: r.childId,
            firstName: r.childFirstName,
            lastName: r.childLastName,
            dob: r.childDob,
            gender: r.childGender,
            allergies: r.childAllergies,
            medicalConditions: r.childMedicalConditions,
            medications: r.childMedications,
            emergencyContacts: contactsByChild.get(r.childId) ?? [],
         },
         parent: {
            firstName: r.parentFirstName,
            lastName: r.parentLastName,
            email: r.parentEmail ?? "",
         },
         formAnswers: answersByChild.get(r.childId) ?? [],
      })),
   };
}
