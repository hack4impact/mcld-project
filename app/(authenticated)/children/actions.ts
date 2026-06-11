"use server";

import {createClient} from "@/utils/supabase/server"; 
import { db } from "@/lib/db";
import { children, emergencyContacts } from "@/lib/db/schema";
import { createChildSchema } from "./schema";

export type ChildActionState = { 
    errors?: Record<string, string[]>;
    message?: string;
    data?: {childId: string};
} | null;

function field(formData: FormData, name: string): string | undefined { 
    const v = formData.get(name);
    return v === null ? undefined : v.toString();
}

export async function createChild(
    _prev: ChildActionState,
    formData: FormData,
): Promise<ChildActionState> {
    const supabase = await createClient();
    const{
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return { errors: { _form: ["Unauthorized"] } }; 

    const contactsRaw = field(formData, "emergency_contacts");
    let emergency_contacts: unknown; 
    try {
        emergency_contacts = contactsRaw ? JSON.parse(contactsRaw) : [];
    } catch {
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
                 parentId: user.id,
                 firstName: data.first_name,
                 lastName: data.last_name,
                 dob: data.dob,
                 gender: data.gender,
                 allergies: data.allergies || null,
                 medicalConditions: data.medical_conditions || null,
                 medications: data.medications || null,
              })
              .returning({ id: children.id });
           await tx.insert(emergencyContacts).values(
              data.emergency_contacts.map((c) => ({
                 childId: child.id,
                 fullName: c.full_name,
                 emailAddress: c.email_address,
                 phoneNumber: c.phone_number,
                 relationship: c.relationship,
              })),
           );
           return child.id;
        });
        return { message: "Child created.", data: { childId } };
     } catch {
        return { errors: { _form: ["Failed to create child. Please try again."] } };
     }
   
}
