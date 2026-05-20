"use client";

import { useState } from "react";
import { Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DiscountModal, type ActiveDiscount, type DiscountService } from "@/components/discount-modal";
import { profileRoleLabel, type UserRow } from "../profile-role-label";

// TODO: replace with real services fetched from Stripe
const PLACEHOLDER_SERVICES: DiscountService[] = [
   { id: "prod_placeholder1", name: "Coaching Session" },
   { id: "prod_placeholder2", name: "Membership" },
];

interface UserActionsCellProps {
   user: UserRow;
   // TODO: accept services as prop once fetched server-side
}

export function UserActionsCell({ user }: UserActionsCellProps) {
   const [open, setOpen] = useState(false);
   // TODO: fetch real discounts from Stripe when modal opens
   const [discounts] = useState<ActiveDiscount[]>([]);

   const handleApply = async (_data: {
      serviceId: string;
      type: "percent" | "amount";
      value: number;
      usageLimit: number;
   }) => {
      // TODO: call applyDiscountToCustomerProduct server action
   };

   const handleRemove = async (_productId: string) => {
      // TODO: call removeDiscountFromCustomerProduct server action
   };

   return (
      <div className="flex items-center justify-end gap-0.5">
         <Tooltip>
            <TooltipTrigger asChild>
               <Button variant="ghost" size="icon-sm" aria-label="Edit user" disabled>
                  <Pencil />
               </Button>
            </TooltipTrigger>
            <TooltipContent>Edit (coming soon)</TooltipContent>
         </Tooltip>
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Manage discounts"
                  onClick={() => setOpen(true)}
               >
                  <Tag />
               </Button>
            </TooltipTrigger>
            <TooltipContent>Manage discounts</TooltipContent>
         </Tooltip>
         <DiscountModal
            userName={`${user.firstName} ${user.lastName}`}
            userEmail={user.email}
            userRole={profileRoleLabel(user.role)}
            discounts={discounts}
            services={PLACEHOLDER_SERVICES}
            open={open}
            onOpenChange={setOpen}
            onApply={handleApply}
            onRemove={handleRemove}
         />
      </div>
   );
}
