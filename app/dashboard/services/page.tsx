import { desc, eq } from "drizzle-orm";
import { ServiceActiveCard } from "@/components/dashboard/service-active-card";
import { ServiceArchivedCard } from "@/components/dashboard/service-archived-card";
import { ServicesSectionHeader } from "@/components/dashboard/services-section-header";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { getLatestCadOneTimePrice } from "@/lib/stripe";
import { cn } from "@/lib/utils";

function formatCad(cents: number) {
   return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
   }).format(cents / 100);
}

type SearchParams = Promise<{ view?: string }>;

export default async function ServicesDashboardPage({
   searchParams,
}: {
   searchParams: SearchParams;
}) {
   const { view } = await searchParams;
   const showArchived = view === "archived";

   const rows = showArchived
      ? await db
           .select()
           .from(services)
           .where(eq(services.status, "archived"))
           .orderBy(desc(services.createdAt))
      : await db
           .select()
           .from(services)
           .where(eq(services.status, "active"))
           .orderBy(desc(services.createdAt));

   const enriched = await Promise.all(
      rows.map(async (s) => {
         const price = await getLatestCadOneTimePrice(s.stripeProductId);
         return { service: s, priceCents: price?.unit_amount ?? null };
      })
   );

   return (
      <div className="space-y-8">
         <ServicesSectionHeader showArchived={showArchived} />

         <div
            className={cn(
               "grid gap-4",
               enriched.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"
            )}
         >
            {enriched.length === 0 ? (
               <p className="text-muted-foreground col-span-full text-sm">
                  {showArchived
                     ? "No archived services."
                     : "No services yet."}
               </p>
            ) : showArchived ? (
               enriched.map(({ service, priceCents }) => (
                  <ServiceArchivedCard
                     key={service.id}
                     service={service}
                     priceLabel={
                        priceCents != null
                           ? formatCad(priceCents)
                           : "No active CAD price"
                     }
                  />
               ))
            ) : (
               enriched.map(({ service, priceCents }) => (
                  <ServiceActiveCard
                     key={service.id}
                     service={service}
                     priceCadDefault={
                        priceCents != null
                           ? (priceCents / 100).toFixed(2)
                           : ""
                     }
                     priceLabel={
                        priceCents != null
                           ? formatCad(priceCents)
                           : "No active CAD price"
                     }
                  />
               ))
            )}
         </div>
      </div>
   );
}
