import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";

export async function GET() {
   // Fetch active services from the database
   const rows = await db
      .select({
         id: services.id,
         type: services.type,
         stripeProductId: services.stripeProductId,
         durationMinutes: services.durationMinutes,
         startDate: services.startDate,
         endDate: services.endDate,
         slots: services.slots,
         requiresSubscription: services.requiresSubscription,
      })
      .from(services)
      .where(eq(services.status, "active"));

   if (rows.length === 0) {
      return NextResponse.json([]);
   }

   // Fetch product and price details from Stripe for each service
   try {
      const productIds = rows.map((r) => r.stripeProductId);

      const [products, prices] = await Promise.all([
         stripe.products.list({ ids: productIds, limit: 100 }),
         stripe.prices.list({ active: true, limit: 100 }),
      ]);

      const productMap = new Map(products.data.map((p) => [p.id, p]));

      // Group prices by product ID for easy lookup
      const pricesByProduct = new Map<string, typeof prices.data>();
      for (const price of prices.data) {
         const productId = price.product as string;
         const existing = pricesByProduct.get(productId) ?? [];
         pricesByProduct.set(productId, [...existing, price]);
      }

      // Combine data into the desired response format
      const body = rows.map((row) => {
         const product = productMap.get(row.stripeProductId);
         const latestPrice = (pricesByProduct.get(row.stripeProductId) ?? [])
            .sort((a, b) => b.created - a.created)[0];

         return {
            id: row.id,
            type: row.type,
            title: product?.name ?? null,
            description: product?.description ?? null,
            priceCents: latestPrice?.unit_amount ?? null,
            priceCurrency: latestPrice?.currency ?? null,
            durationMinutes: row.durationMinutes,
            startDate: row.startDate,
            endDate: row.endDate,
            slots: row.slots,
            requiresSubscription: row.requiresSubscription,
         };
      });

      return NextResponse.json(body);
   } catch {
      return NextResponse.json(
         { error: "Impossible to fetch stripe services or no stripe services." },
         { status: 500 },
      );
   }
}
