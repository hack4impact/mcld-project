import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getStripeServiceData } from "@/lib/stripe";

const CORS_HEADERS = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Methods": "GET, OPTIONS",
   "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
   return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
   const rows = await db
      .select()
      .from(services)
      .where(eq(services.status, "active"));

   const body = await Promise.all(
      rows.map(async (row) => {
         const stripe = await getStripeServiceData(row.stripeProductId);
         return {
            id: row.id,
            type: row.type,
            title: stripe?.title,
            description: stripe?.description,
            priceCents: stripe?.priceCents,
            priceCurrency: stripe?.priceCurrency,
            durationMinutes: row.durationMinutes,
            startDate: row.startDate,
            endDate: row.endDate,
            slots: row.slots,
         };
      }),
   );

   return NextResponse.json(body, { headers: CORS_HEADERS });
}
