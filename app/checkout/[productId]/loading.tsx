import { Loader2Icon } from "lucide-react";

export default function CheckoutLoading() {
   return (
      <div className="flex w-full max-w-xl items-center justify-center py-24">
         <Loader2Icon
            role="status"
            aria-label="Loading checkout"
            className="size-6 animate-spin text-muted-foreground"
         />
      </div>
   );
}
