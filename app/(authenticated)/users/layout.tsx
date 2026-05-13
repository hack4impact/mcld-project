import type { ReactNode } from "react";

/**
 * Caps the /users subtree height in the flex chain so content scrolls inside the
 * table, not the whole page (requires flex-1/min-h-0 on ancestors).
 */
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
