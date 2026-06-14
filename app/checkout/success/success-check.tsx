import { Check } from "lucide-react";

import styles from "../result-badge.module.css";

export function SuccessCheck() {
   return (
      <span
         className={`${styles.badge} ${styles.check} mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100`}
      >
         <Check
            className="size-8 text-green-600"
            strokeWidth={3}
            aria-hidden="true"
         />
      </span>
   );
}
