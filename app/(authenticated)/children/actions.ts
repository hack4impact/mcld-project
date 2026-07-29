"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { children, emergencyContacts } from "@/lib/db/schema";
import {
   createChildSchema,
   updateChildSchema,
} from "@/app/(authenticated)/users/children-schema";
import type { ChildActionState } from "@/app/(authenticated)/users/children-actions";

const CHILDREN_PATH = "/children";

function field(formData: FormData, name: string): string | undefined {
   const v = formData.get(name);
   return v === null ? undefined : v.toString();
}

function parseEmergencyContacts(formData: FormData) {
   const contactsRaw = field(formData, "emergency_contacts");
   try {
      return contactsRaw ? JSON.parse(contactsRaw) : [];
   } catch {
      return null;
   }
}

async function insertEmergencyContacts(
   tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
   childId: string,
   contacts: {
      full_name: string;
      email_address: string;
      phone_number: string;
      relationship: string;
   }[],
) {
   if (contacts.length === 0) return;
   await tx.insert(emergencyContacts).values(
      contacts.map((c) => ({
         childId,
         fullName: c.full_name,
         emailAddress: c.email_address,
         phoneNumber: c.phone_number,
         relationship: c.relationship,
      })),
   );
}

async function requireUserId(): Promise<string | null> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   return user?.id ?? null;
}

export async function createChild(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   const userId = await requireUserId();
   if (!userId) return { errors: { _form: ["Unauthorized"] } };

   const emergency_contacts = parseEmergencyContacts(formData);
   if (emergency_contacts === null) {
      return { errors: { emergency_contacts: ["Invalid emergency contacts"] } };
   }

   const parsed = createChildSchema.safeParse({
      first_name: field(formData, "first_name"),
      last_name: field(formData, "last_name"),
      dob: field(formData, "dob"),
      gender: field(formData, "gender"),
      allergies: field(formData, "allergies"),
      medical_conditions: field(formData, "medical_conditions"),
      medications: field(formData, "medications"),
      emergency_contacts,
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const data = parsed.data;

   try {
      const childId = await db.transaction(async (tx) => {
         const [child] = await tx
            .insert(children)
            .values({
               parentId: userId,
               firstName: data.first_name,
               lastName: data.last_name,
               dob: data.dob,
               gender: data.gender,
               allergies: data.allergies || null,
               medicalConditions: data.medical_conditions || null,
               medications: data.medications || null,
            })
            .returning({ id: children.id });

         await insertEmergencyContacts(tx, child.id, data.emergency_contacts);
         return child.id;
      });

      revalidatePath(CHILDREN_PATH);
      return { message: "Child created.", data: { childId } };
   } catch {
      return {
         errors: { _form: ["Failed to create child. Please try again."] },
      };
   }
}

export async function updateChild(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   const userId = await requireUserId();
   if (!userId) return { errors: { _form: ["Unauthorized"] } };

   const emergency_contacts = parseEmergencyContacts(formData);
   if (emergency_contacts === null) {
      return { errors: { emergency_contacts: ["Invalid emergency contacts"] } };
   }

   const parsed = updateChildSchema.safeParse({
      child_id: field(formData, "child_id"),
      first_name: field(formData, "first_name"),
      last_name: field(formData, "last_name"),
      dob: field(formData, "dob"),
      gender: field(formData, "gender"),
      allergies: field(formData, "allergies"),
      medical_conditions: field(formData, "medical_conditions"),
      medications: field(formData, "medications"),
      emergency_contacts,
   });

   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const data = parsed.data;

   const [existing] = await db
      .select({ id: children.id })
      .from(children)
      .where(
         and(eq(children.id, data.child_id), eq(children.parentId, userId)),
      )
      .limit(1);

   if (!existing) return { errors: { _form: ["Child not found"] } };

   try {
      await db.transaction(async (tx) => {
         await tx
            .update(children)
            .set({
               firstName: data.first_name,
               lastName: data.last_name,
               dob: data.dob,
               gender: data.gender,
               allergies: data.allergies || null,
               medicalConditions: data.medical_conditions || null,
               medications: data.medications || null,
               updatedAt: new Date(),
            })
            .where(eq(children.id, data.child_id));

         await tx
            .delete(emergencyContacts)
            .where(eq(emergencyContacts.childId, data.child_id));

         await insertEmergencyContacts(
            tx,
            data.child_id,
            data.emergency_contacts,
         );
      });

      revalidatePath(CHILDREN_PATH);
      return { message: "Child updated.", data: { childId: data.child_id } };
   } catch {
      return {
         errors: { _form: ["Failed to update child. Please try again."] },
      };
   }
}

export async function deleteChild(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   const userId = await requireUserId();
   if (!userId) return { errors: { _form: ["Unauthorized"] } };

   const childId = field(formData, "child_id");
   if (!childId) return { errors: { _form: ["Child not found"] } };

   const [existing] = await db
      .select({ id: children.id })
      .from(children)
      .where(and(eq(children.id, childId), eq(children.parentId, userId)))
      .limit(1);

   if (!existing) return { errors: { _form: ["Child not found"] } };

   try {
      await db.delete(children).where(eq(children.id, childId));
      revalidatePath(CHILDREN_PATH);
      return { message: "Child deleted." };
   } catch {
      return {
         errors: { _form: ["Failed to delete child. Please try again."] },
      };
   }
}
