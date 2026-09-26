"use server";

import { and, eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { children, emergencyContacts, profiles } from "@/lib/db/schema";
import {
   createChildAdminSchema,
   updateChildAdminSchema,
   type ChildActionState,
} from "./children-schema";
import {
   listChildrenForParent,
   type ChildView,
} from "./children-queries";
import {
   field,
   insertEmergencyContacts,
   parseEmergencyContacts,
   revalidateChildrenPaths,
} from "./children-shared";


export async function listChildrenForUserAdmin(
   parentId: string,
): Promise<ChildView[] | { error: string }> {
   try {
      await requireAdmin();
   } catch {
      return { error: "Unauthorized" };
   }

   return listChildrenForParent(parentId);
}

export async function createChildAdmin(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const emergency_contacts = parseEmergencyContacts(formData);
   if (emergency_contacts === null) {
      return { errors: { emergency_contacts: ["Invalid emergency contacts"] } };
   }

   const parsed = createChildAdminSchema.safeParse({
      parent_id: field(formData, "parent_id"),
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

   const parent = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, data.parent_id))
      .limit(1);

   if (parent.length === 0) {
      return { errors: { _form: ["User not found"] } };
   }

   try {
      const childId = await db.transaction(async (tx) => {
         const [child] = await tx
            .insert(children)
            .values({
               parentId: data.parent_id,
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

      revalidateChildrenPaths();
      return { message: "Child created.", data: { childId } };
   } catch {
      return {
         errors: { _form: ["Failed to create child. Please try again."] },
      };
   }
}

export async function updateChildAdmin(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   try {
      await requireAdmin();
   } catch {
      return { errors: { _form: ["Unauthorized"] } };
   }

   const emergency_contacts = parseEmergencyContacts(formData);
   if (emergency_contacts === null) {
      return { errors: { emergency_contacts: ["Invalid emergency contacts"] } };
   }

   const parsed = updateChildAdminSchema.safeParse({
      parent_id: field(formData, "parent_id"),
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
         and(
            eq(children.id, data.child_id),
            eq(children.parentId, data.parent_id),
         ),
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

      revalidateChildrenPaths();
      return { message: "Child updated.", data: { childId: data.child_id } };
   } catch {
      return {
         errors: { _form: ["Failed to update child. Please try again."] },
      };
   }
}
