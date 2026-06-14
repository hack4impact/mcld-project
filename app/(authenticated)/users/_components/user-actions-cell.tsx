"use client";

import { useRef, useState } from "react";
import { Pencil, Tag, ReceiptText} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DiscountModal, type ActiveDiscount, type DiscountService } from "@/components/discount-modal";
import {
   getUserDiscountModalData,
   applyDiscountToCustomerProduct,
   removeCouponById,
} from "@/app/(authenticated)/discounts/actions";
import { toast } from "sonner";
import { profileRoleLabel, type UserRow } from "../profile-role-label";
import { UserTransactionsModal } from "./components/user-transactions-modals";


interface UserActionsCellProps {
   user: UserRow;
   onEdit: (user: UserRow) => void;
}

export function UserActionsCell({ user, onEdit }: UserActionsCellProps) {
   const [txOpen, setTxOpen] = useState(false);
   const [open, setOpen] = useState(false);
   const [services, setServices] = useState<DiscountService[]>([]);
   const [discounts, setDiscounts] = useState<ActiveDiscount[]>([]);
   const [loading, setLoading] = useState(false);
   const servicesFetched = useRef(false);

   const fetchModalData = async (forceServices = false) => {
      if (!user.stripeCustomerId) return;
      setLoading(true);
      try {
         const data = await getUserDiscountModalData(user.stripeCustomerId);
         if (forceServices || !servicesFetched.current) {
            setServices(data.services);
            servicesFetched.current = true;
         }
         setDiscounts(data.discounts);
      } finally {
         setLoading(false);
      }
   };

   const handleOpenChange = async (next: boolean) => {
      setOpen(next);
      if (next) await fetchModalData();
   };

   const handleApply = async (data: {
      serviceId: string;
      type: "percent" | "amount";
      value: number;
      usageLimit: number;
   }) => {
      if (!user.stripeCustomerId) return;
      const fd = new FormData();
      fd.append("product_id", data.serviceId);
      fd.append("customer_id", user.stripeCustomerId);
      fd.append("usage_limit", String(data.usageLimit));
      fd.append("discount_type", data.type);
      const discountValue = data.type === "amount" ? Math.round(parseFloat(data.value.toFixed(2)) * 100) : data.value;
      fd.append("discount_value", String(discountValue));
      if (data.type === "amount") fd.append("currency", "cad");
      const result = await applyDiscountToCustomerProduct(null, fd);
      if (result?.errors) {
         toast.error("Failed to apply discount", {
            description: Object.values(result.errors).flat().join(" "),
         });
      } else {
         toast.success("Discount applied");
         await fetchModalData();
      }
   };

   const handleRemove = async (couponId: string) => {
      if (!user.stripeCustomerId) return;
      const result = await removeCouponById(couponId, user.stripeCustomerId);
      if (result?.errors) {
         toast.error("Failed to remove discount", {
            description: Object.values(result.errors).flat().join(" "),
         });
      } else {
         toast.success("Discount removed");
         setDiscounts((prev) => prev.filter((d) => d.id !== couponId));
      }
   };

   return (
      <div className="flex items-center justify-end gap-0.5">
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit user"
                  onClick={() => onEdit(user)}
               >
                  <Pencil />
               </Button>
            </TooltipTrigger>
            <TooltipContent>Edit user</TooltipContent>
         </Tooltip>
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Manage discounts"
                  disabled={!user.stripeCustomerId || loading}
                  onClick={() => handleOpenChange(true)}
               >
                  <Tag />
               </Button>
            </TooltipTrigger>
            <TooltipContent>
               {user.stripeCustomerId ? "Manage discounts" : "No Stripe customer"}
            </TooltipContent>
         </Tooltip>
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="View transactions"
                  disabled={!user.stripeCustomerId}
                  onClick={() => setTxOpen(true)}
               >
                  <ReceiptText />
               </Button>
            </TooltipTrigger>
            <TooltipContent>
               {user.stripeCustomerId ? "View transactions" : "No Stripe customer"}
            </TooltipContent>
         </Tooltip>
         <DiscountModal
            userName={`${user.firstName} ${user.lastName}`}
            userEmail={user.email}
            userRole={profileRoleLabel(user.role)}
            discounts={discounts}
            services={services}
            loading={loading}
            open={open}
            onOpenChange={handleOpenChange}
            onApply={handleApply}
            onRemove={handleRemove}
         />
         <UserTransactionsModal
            userName={`${user.firstName} ${user.lastName}`}
            userEmail={user.email}
            stripeCustomerId={user.stripeCustomerId || ""}
            open={txOpen}
            onOpenChange={setTxOpen}
         />
      </div>
   );
}
