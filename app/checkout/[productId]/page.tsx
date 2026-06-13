import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { getProductDiscountForUser } from "@/lib/stripe";
import { getService } from "@/app/(authenticated)/services/queries";
import { listChildrenForParent,getEnrolledChildIdsForProgram } from "@/app/(authenticated)/children/queries";
import { CheckoutFlow } from "./checkout-flow";
import { getForm } from "@/app/(authenticated)/forms/queries";
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

   const [children, enrolledChildIds] = await Promise.all([
      listChildrenForParent(user.id),
      service.isForChildren
         ? getEnrolledChildIdsForProgram(productId, user.id)
         : Promise.resolve([]),
   ]);

   const discount = await getProductDiscountForUser({
      userId: user.id,
      productId: service.stripeProductId,
   });

   const attachedForm =
   service.formId ? await getForm(service.formId) : null;

   return (
      <div className="mx-auto w-full max-w-4xl">
         <CheckoutFlow service={service} discount={discount} parentChildren={children} enrolledChildIds={enrolledChildIds} attachedForm={attachedForm?.questions.length ? attachedForm : null}/>
      </div>
   );
}

function NotAvailable({ message }: { message: string }) {
   return (
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md">
         <h1 className="text-xl font-bold text-muted-foreground">
            <span className="flex items-center gap-2 text-center">
               <X className="size-8 text-red-600" />
               {message}
            </span>
         </h1>
         <Button asChild>
            <Link href="/">Go back home</Link>
         </Button>
      </div>
   );
}
