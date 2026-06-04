import { X } from "lucide-react";

export function CancelCross() {
   return (
      <span className="result-badge result-badge--cross mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
         <X
            className="size-8 text-red-600"
            strokeWidth={3}
            aria-hidden="true"
         />
      </span>
   );
}
