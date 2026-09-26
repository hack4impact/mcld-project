import { useCallback, useEffect, useState } from "react";

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
