import { X } from "lucide-react";

import styles from "../result-badge.module.css";

export function CancelCross() {
   return (
      <span
         className={`${styles.badge} ${styles.cross} mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5`}
      >
         <X
            className="size-8 text-destructive"
            strokeWidth={3}
            aria-hidden="true"
         />
      </span>
   );
}
