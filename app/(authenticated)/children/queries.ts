import {and, asc, eq, inArray, isNotNull, or} from "drizzle-orm";
import { db } from "@/lib/db";
import { children, emergencyContacts, serviceBookings} from "@/lib/db/schema";

export type ChildView = {
    id: string;
    firstName: string;
    lastName: string;
    dob: string; 
    gender: "male" | "female" | "prefer_not_to_say";
    allergies: string | null;
    medicalConditions: string | null; 
    medications: string | null;
    emergencyContacts: {
        id: string; 
        fullName: string;
        emailAddress: string;
        phoneNumber: string;
        relationship: string;
    }[]; 
}

export async function listChildrenForParent(parentId: string): Promise<ChildView[]> { 
    const rows = await db
        .select()
        .from(children)
        .where(eq(children.parentId, parentId))
        .orderBy(asc(children.firstName), asc(children.lastName)); 

    if (rows.length === 0) return [];

    const childIds = rows.map( (r) => r.id);
    const contacts = await db
        .select()
        .from(emergencyContacts)
        .where(inArray(emergencyContacts.childId, childIds)); 
    
    const contactsByChildId = new Map<string, typeof contacts>(); 
    for (const c of contacts) {
        const list = contactsByChildId.get(c.childId) ?? [];
        list.push(c);
        contactsByChildId.set(c.childId, list);
        }
        
        return rows.map((row) => ({
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            dob: row.dob,
            gender: row.gender,
            allergies: row.allergies,
            medicalConditions: row.medicalConditions,
            medications: row.medications,
            emergencyContacts: (contactsByChildId.get(row.id) ?? []).map((c) => ({
               id: c.id,
               fullName: c.fullName,
               emailAddress: c.emailAddress,  // add this — it's in the schema
               phoneNumber: c.phoneNumber,
               relationship: c.relationship,
            })),
    }));
}

export async function getEnrolledChildIdsForProgram(
    serviceId: string,
    parentId: string, 
): Promise<string[]> {
    const rows = await db
        .select({childId: serviceBookings.childId})
        .from(serviceBookings)
        .where(
            and(
                eq(serviceBookings.serviceId, serviceId),
                eq(serviceBookings.userId, parentId),
                isNotNull(serviceBookings.childId),
                eq(serviceBookings.isActive, true),
                or(
                    inArray(serviceBookings.status, ["confirmed", "pending"]),
                    and(
                        eq(serviceBookings.status, "awaiting_payment"),
                        isNotNull(serviceBookings.stripeOrderId),
                    ),
                ),
            )
        );
    return rows.map((r) => r.childId).filter((id): id is string => id !== null);
}
