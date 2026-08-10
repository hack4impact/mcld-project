import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type AccountProfile = {
   firstName: string;
   lastName: string;
   phone: string | null;
   address: string | null;
   dob: string | null;
   gender: string | null;
   memberSince: Date;
};

export async function getAccountProfile(
   userId: string,
): Promise<AccountProfile | null> {
   const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: {
         firstName: true,
         lastName: true,
         phone: true,
         address: true,
         dob: true,
         gender: true,
         createdAt: true,
      },
   });

   if (!profile) return null;

   return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      address: profile.address,
      dob: profile.dob,
      gender: profile.gender,
      memberSince: profile.createdAt,
   };
}
