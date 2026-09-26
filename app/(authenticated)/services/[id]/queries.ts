import { eq, inArray } from "drizzle-orm";
import { pgSchema, uuid, text } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import {
   children,
   emergencyContacts,
   formQuestionAnswers,
   formQuestions,
   profiles,
   privateLessonSessions,
   serviceBookings,
   services,
} from "@/lib/db/schema";

import {
   loadCashSessionRegistrations,
   withoutInvoiceDuplicates,
   cashSessionDetails,
   type CashSessionDetails,
} from "@/lib/cash-session-read-model";
import { isCashSession } from "@/lib/private-lessons";

const auth = pgSchema("auth");
const authUsers = auth.table("users", {
   id: uuid("id").primaryKey(),
   email: text("email"),
});

export type AdultRegistration = {
   bookingId: string;
   status: string;
   registeredAt: Date;
   paidInCash?: boolean;
   cashDetails?: CashSessionDetails;
   profile: { id: string; firstName: string; lastName: string; email: string };
};

export type KidRegistration = {
   bookingId: string;
   status: string;
   registeredAt: Date;
   paidInCash?: boolean;
   cashDetails?: CashSessionDetails;
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
   const [service] = await db
      .select({
         type: services.type,
         isForChildren: services.isForChildren,
         formId: services.formId,
      })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

   if (!service) return { kind: "adult", registrations: [] };

   const bookings =
      service.type === "private_lessons"
         ? privateLessonSessions
         : serviceBookings;
   const cash =
      service.type === "private_lessons"
         ? await loadCashSessionRegistrations({ serviceId })
         : [];

   if (!service.isForChildren) {
      const rows = await db
         .select({
            bookingId: bookings.id,
            status: bookings.status,
            registeredAt: bookings.createdAt,
            stripeOrderId: bookings.stripeOrderId,
            profileId: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            email: authUsers.email,
         })
         .from(bookings)
         .innerJoin(profiles, eq(profiles.id, bookings.userId))
         .innerJoin(authUsers, eq(authUsers.id, bookings.userId))
         .where(eq(bookings.serviceId, serviceId));

      return {
         kind: "adult",
         registrations: [
            ...withoutInvoiceDuplicates(rows, cash).map(
               (r): AdultRegistration => ({
                  bookingId: r.bookingId,
                  status: r.status,
                  registeredAt: r.registeredAt,
                  paidInCash: isCashSession(r.stripeOrderId),
                  profile: {
                     id: r.profileId,
                     firstName: r.firstName,
                     lastName: r.lastName,
                     email: r.email ?? "",
                  },
               }),
            ),
            ...cash
               .filter((record) => !record.child)
               .map(
                  (record): AdultRegistration => ({
                     bookingId: record.invoiceId,
                     status: "completed",
                     registeredAt: record.createdAt,
                     profile: record.profile,
                     paidInCash: true,
                     cashDetails: cashSessionDetails(record),
                  }),
               ),
         ].sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime()),
      };
   }

   // Kid service: bookings link to a child via childId
   const localBookingRows = await db
      .select({
         bookingId: bookings.id,
         status: bookings.status,
         registeredAt: bookings.createdAt,
         stripeOrderId: bookings.stripeOrderId,
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
      .from(bookings)
      .innerJoin(children, eq(children.id, bookings.childId))
      .innerJoin(profiles, eq(profiles.id, children.parentId))
      .innerJoin(authUsers, eq(authUsers.id, children.parentId))
      .where(eq(bookings.serviceId, serviceId));

   const bookingRows = [
      ...withoutInvoiceDuplicates(localBookingRows, cash).map((row) => ({
         ...row,
         cashDetails: undefined as CashSessionDetails | undefined,
      })),
      ...cash.flatMap((record) =>
         record.child
            ? [
                 {
                    bookingId: record.invoiceId,
                    status: "completed" as const,
                    registeredAt: record.createdAt,
                    stripeOrderId: record.invoiceId,
                    childId: record.child.id,
                    childFirstName: record.child.firstName,
                    childLastName: record.child.lastName,
                    childDob: record.child.dob,
                    childGender: record.child.gender,
                    childAllergies: record.child.allergies,
                    childMedicalConditions: record.child.medicalConditions,
                    childMedications: record.child.medications,
                    parentFirstName: record.profile.firstName,
                    parentLastName: record.profile.lastName,
                    parentEmail: record.profile.email,
                    cashDetails: cashSessionDetails(record),
                 },
              ]
            : [],
      ),
   ].sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());

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
      {
         fullName: string;
         emailAddress: string;
         phoneNumber: string;
         relationship: string;
      }[]
   >();
   for (const c of contactRows) {
      const list = contactsByChild.get(c.childId) ?? [];
      list.push(c);
      contactsByChild.set(c.childId, list);
   }

   const answersByChild = new Map<
      string,
      { prompt: string; answer: string[] }[]
   >();
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
         paidInCash: isCashSession(r.stripeOrderId),
         cashDetails: r.cashDetails,
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
