import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { getProductDiscountForUser } from "@/lib/stripe";
import { getService } from "@/app/(authenticated)/services/queries";

import { CheckoutFlow } from "./checkout-flow";
import { X } from "lucide-react";

export default async function CheckoutPage({
   params,
}: {
   params: Promise<{ productId: string }>;
}) {
   const { productId } = await params;

   const supabase = await createClient();
   const {
      data: { user },
   } = await supabase.auth.getUser();
   if (!user) {
      return <NotAvailable message="You must be signed in to check out." />;
   }

   const service = await getService(productId);
   if (!service || service.status !== "active") {
      return <NotAvailable message="This product isn't available." />;
   }

   const discount = await getProductDiscountForUser({
      userId: user.id,
      productId: service.stripeProductId,
   });

   return (
      <div className="mx-auto w-full max-w-4xl">
         <CheckoutFlow service={service} discount={discount} />
      </div>
   );
}

function NotAvailable({ message }: { message: string }) {
   return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
         <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <X className="size-7 text-destructive" strokeWidth={2.5} />
         </span>
         <h1 className="text-xl font-semibold text-foreground">{message}</h1>
         <Button asChild>
            <Link href="/">Go back home</Link>
         </Button>
      </div>
   );
}
