"use server";

import { and, eq } from "drizzle-orm";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/db";
import { children, emergencyContacts } from "@/lib/db/schema";
import { ROLES } from "@/lib/roles";
import {
   createChildSchema,
   deleteChildSchema,
   updateChildSchema,
   type ChildActionState,
} from "@/app/(authenticated)/users/children-schema";
import {
   field,
   insertEmergencyContacts,
   parseEmergencyContacts,
   revalidateChildrenPaths,
} from "@/app/(authenticated)/users/children-shared";

async function requireParentUserId(): Promise<string | null> {
   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) return null;

   const { data: claimsData } = await supabase.auth.getClaims();
   if (claimsData?.claims?.user_role !== ROLES.USER) return null;

   return user.id;
}

export async function createChild(
   _prev: ChildActionState,
   formData: FormData,
): Promise<ChildActionState> {
   const userId = await requireParentUserId();
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

      revalidateChildrenPaths();
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
   const userId = await requireParentUserId();
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

      revalidateChildrenPaths();
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
   const userId = await requireParentUserId();
   if (!userId) return { errors: { _form: ["Unauthorized"] } };

   const parsed = deleteChildSchema.safeParse({
      child_id: field(formData, "child_id"),
   });
   if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
   }

   const { child_id: childId } = parsed.data;

   const [existing] = await db
      .select({ id: children.id })
      .from(children)
      .where(and(eq(children.id, childId), eq(children.parentId, userId)))
      .limit(1);

   if (!existing) return { errors: { _form: ["Child not found"] } };

   try {
      await db.delete(children).where(eq(children.id, childId));
      revalidateChildrenPaths();
      return { message: "Child deleted." };
   } catch {
      return {
         errors: { _form: ["Failed to delete child. Please try again."] },
      };
   }
}
