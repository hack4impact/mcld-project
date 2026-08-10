import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { children, emergencyContacts } from "@/lib/db/schema";

export type AccountChildContact = {
   fullName: string;
   emailAddress: string;
   phoneNumber: string;
   relationship: string;
};

export type AccountChild = {
   id: string;
   firstName: string;
   lastName: string;
   dob: string;
   gender: string;
   allergies: string | null;
   medicalConditions: string | null;
   medications: string | null;
   emergencyContacts: AccountChildContact[];
};

export async function listChildrenForParent(
   parentId: string,
): Promise<AccountChild[]> {
   const childRows = await db
      .select()
      .from(children)
      .where(eq(children.parentId, parentId))
      .orderBy(asc(children.firstName), asc(children.lastName));

   if (childRows.length === 0) return [];

   const contactRows = await db
      .select({
         childId: emergencyContacts.childId,
         fullName: emergencyContacts.fullName,
         emailAddress: emergencyContacts.emailAddress,
         phoneNumber: emergencyContacts.phoneNumber,
         relationship: emergencyContacts.relationship,
      })
      .from(emergencyContacts)
      .where(
         inArray(
            emergencyContacts.childId,
            childRows.map((c) => c.id),
         ),
      );

   const contactsByChild = new Map<string, AccountChildContact[]>();
   for (const { childId, ...contact } of contactRows) {
      const list = contactsByChild.get(childId) ?? [];
      list.push(contact);
      contactsByChild.set(childId, list);
   }

   return childRows.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      dob: child.dob,
      gender: child.gender,
      allergies: child.allergies,
      medicalConditions: child.medicalConditions,
      medications: child.medications,
      emergencyContacts: contactsByChild.get(child.id) ?? [],
   }));
}
