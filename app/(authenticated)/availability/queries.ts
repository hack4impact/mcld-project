import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";

export async function listPrivateLessonDurations(
   coordinatorId: string,
): Promise<number[]> {
   const rows = await db
      .selectDistinct({ durationMinutes: services.durationMinutes })
      .from(services)
      .where(
         and(
            eq(services.coordinatorId, coordinatorId),
            eq(services.type, "private_lessons"),
            eq(services.status, "active"),
         ),
      );
   return rows.map((row) => row.durationMinutes).sort((a, b) => a - b);
}
