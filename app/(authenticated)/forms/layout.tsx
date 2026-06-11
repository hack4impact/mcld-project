import type { ReactNode } from "react";

/** Bounded height for /forms so the table can paginate inside the column. */
export default function FormsLayout({
   children,
}: {
   children: ReactNode;
}) {
   return (
      <div className="flex h-full max-h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
         {children}
      </div>
   );
}
