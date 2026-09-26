import { useCallback, useEffect, useState } from "react";

/**
 * Seconds left before an action (e.g. resending an email) may run again.
 * Starts counting down right away unless `startActive` is false.
 */
export function useCooldown(seconds: number, startActive = true) {
   const [remaining, setRemaining] = useState(startActive ? seconds : 0);

   useEffect(() => {
      if (remaining <= 0) return;
      const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
      return () => clearTimeout(id);
   }, [remaining]);

   const start = useCallback(() => setRemaining(seconds), [seconds]);

   return { remaining, start };
}
