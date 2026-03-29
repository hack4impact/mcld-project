"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
   priceId,
   mode = "subscription",
   label = "Subscribe",
}: {
   priceId: string;
   mode?: "subscription" | "payment";
   label?: string;
}) {
   const [loading, setLoading] = useState(false);

   async function handleCheckout() {
      setLoading(true);
      try {
         const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId, mode }),
         });
         const data = await res.json();
         if (data.url) {
            window.location.href = data.url;
         }
      } finally {
         setLoading(false);
      }
   }

   return (
      <Button onClick={handleCheckout} disabled={loading} className="w-full">
         {loading ? "Redirecting..." : label}
      </Button>
   );
}
