import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function CheckoutCancelPage() {
   return (
      <div className="w-full max-w-md text-center">
         <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <X className="size-8 text-red-600" />
         </div>
         <h1 className="mb-2 font-heading text-2xl font-semibold">
            Payment cancelled
         </h1>
         <p className="mb-8 text-sm text-muted-foreground">
            Your payment was not processed. You have not been charged.
         </p>
         <Button asChild>
            <Link href="/">Go back</Link>
         </Button>
      </div>
   );
}
