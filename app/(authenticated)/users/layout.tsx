import type { ReactNode } from "react";

/** Bounded height for /users so the table can scroll inside the column. */
export default function UsersLayout({
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
