import Link from "next/link";
import { Button } from "@/components/ui/button";

import { CancelCross } from "./cancel-cross";

export default function CheckoutCancelPage() {
   return (
      <div className="w-full max-w-md text-center">
         <CancelCross />
         <h1 className="mb-2 font-heading text-2xl font-semibold">
            Payment cancelled
         </h1>
         <p className="mb-8 text-sm text-muted-foreground">
            Your payment was not processed. You have not been charged.
         </p>
      </div>
   );
}
