import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { emergencyContacts } from "@/lib/db/schema";

const USERS_PATH = "/users";
const CHILDREN_PATH = "/children";

export function field(
   formData: FormData,
   name: string,
): string | undefined {
   const v = formData.get(name);
   return v === null ? undefined : v.toString();
}

export function parseEmergencyContacts(formData: FormData) {
   const contactsRaw = field(formData, "emergency_contacts");
   try {
      return contactsRaw ? JSON.parse(contactsRaw) : [];
   } catch {
      return null;
   }
}

export async function insertEmergencyContacts(
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

export function revalidateChildrenPaths() {
   revalidatePath(USERS_PATH);
   revalidatePath(CHILDREN_PATH);
}
