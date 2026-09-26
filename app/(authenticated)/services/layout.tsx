import type { ReactNode } from "react";

/** Bounded height for /services so the table can paginate inside the column. */
export default function ServicesLayout({ children }: { children: ReactNode }) {
   return (
      <div className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
         {children}
      </div>
   );
}
