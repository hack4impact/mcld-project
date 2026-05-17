"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface ActiveDiscount {
  id: string;
  service: string;
  type: "Percent" | "Amount";
  value: string;
  used: string;
}

export interface DiscountService {
  id: string;
  name: string;
}

interface DiscountModalProps {
  userName: string;
  userEmail: string;
  userRole: string;
  discounts?: ActiveDiscount[];
  services?: DiscountService[];
  onApply?: (data: {
    serviceId: string;
    type: "percent" | "amount";
    value: number;
    usageLimit: number;
  }) => void;
  onRemove?: (id: string) => void;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// todo: apply the fonts to the entire project rather than here
const pjs = "'Plus Jakarta Sans', sans-serif";
const lexend = "'Lexend', sans-serif";

const TABLE_GRID = "grid grid-cols-[2fr_1fr_1fr_1fr_2.5rem]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[0.625rem] font-extrabold text-[#00327d] tracking-[0.6px] uppercase"
      style={{ fontFamily: pjs }}
    >
      {children}
    </span>
  );
}

// todo: use project's design system for colors
export function DiscountModal({
  userName,
  userEmail,
  userRole,
  discounts = [],
  services = [],
  onApply,
  onRemove,
  trigger,
  open,
  onOpenChange,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = React.useState<"percent" | "amount">("percent");
  const [value, setValue] = React.useState("20");
  const [usageLimit, setUsageLimit] = React.useState("1");
  const [serviceId, setServiceId] = React.useState("");
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const handleApply = () => {
    onApply?.({
      serviceId,
      type: discountType,
      value: Number(value),
      usageLimit: Number(usageLimit),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl w-full p-0 gap-0 rounded-[2rem] shadow-[0px_18px_48px_0px_rgba(0,0,0,0.18)] overflow-hidden ring-0 border-0 bg-white"
      >
        <DialogTitle className="sr-only">Discounts for {userName}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-4 pb-3.5 gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2
              className="text-lg font-extrabold text-[#191c1d] leading-normal truncate"
              style={{ fontFamily: pjs }}
            >
              Discounts for {userName}
            </h2>
            <p
              className="text-xs text-[#3f484c] leading-normal"
              style={{ fontFamily: lexend, fontWeight: 400 }}
            >
              {userEmail}{"  ·  "}{userRole}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center size-7 rounded-full bg-[#f8f9fa] text-[#191c1d] text-sm font-semibold hover:bg-[#e9ecef] transition-colors shrink-0"
            style={{ fontFamily: pjs }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#e6eaef]" />

        {/* Active Discounts */}
        <div className="flex flex-col gap-2 px-7 pt-4 pb-1.5">
          <h3
            className="text-sm font-extrabold text-[#191c1d] leading-normal"
            style={{ fontFamily: pjs }}
          >
            Active discounts
          </h3>

          <div className="w-full rounded-lg border border-[#e6eaef] overflow-hidden">
            {/* Table header */}
            <div className={`${TABLE_GRID} bg-[#edf4fd]`}>
              <div className="flex items-center h-8 px-3"><FieldLabel>Service</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Type</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Value</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Used</FieldLabel></div>
              <div className="h-8" />
            </div>

            {/* Table rows */}
            {discounts.length === 0 ? (
              <div
                className="flex items-center justify-center h-10 text-xs text-[#3f484c]"
                style={{ fontFamily: lexend, fontWeight: 400 }}
              >
                No active discounts
              </div>
            ) : (
              discounts.map((discount, i) => (
                <div
                  key={discount.id}
                  className={`${TABLE_GRID} ${i % 2 === 0 ? "bg-white" : "bg-[#f8fafd]"}`}
                >
                  <div className="flex items-center h-10 px-3 min-w-0">
                    <span className="text-xs font-semibold text-[#191c1d] truncate" style={{ fontFamily: lexend }}>
                      {discount.service}
                    </span>
                  </div>
                  <div className="flex items-center h-10 px-3 min-w-0">
                    <span className="text-xs text-[#3f484c] truncate" style={{ fontFamily: lexend, fontWeight: 400 }}>
                      {discount.type}
                    </span>
                  </div>
                  <div className="flex items-center h-10 px-3 min-w-0">
                    <span className="text-xs font-bold text-[#0040a1] truncate" style={{ fontFamily: lexend }}>
                      {discount.value}
                    </span>
                  </div>
                  <div className="flex items-center h-10 px-3 min-w-0">
                    <span className="text-xs text-[#3f484c] truncate" style={{ fontFamily: lexend, fontWeight: 400 }}>
                      {discount.used}
                    </span>
                  </div>
                  <div className="flex items-center justify-center h-10">
                    <button
                      onClick={() => onRemove?.(discount.id)}
                      className="flex items-center justify-center p-1.5 rounded-full bg-[#fef2f2] hover:bg-red-100 transition-colors"
                      aria-label={`Remove discount for ${discount.service}`}
                    >
                      <Trash2 className="size-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Apply New Discount */}
        <div className="flex flex-col gap-3 px-7 py-4 bg-[#fafbfd] border-t border-[#e6eaef]">
          <h3
            className="text-sm font-extrabold text-[#191c1d] leading-normal"
            style={{ fontFamily: pjs }}
          >
            Apply new discount
          </h3>

          {/* Service selector */}
          <div className="flex flex-col gap-1 w-full">
            <FieldLabel>Service</FieldLabel>
            <div className="relative">
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="appearance-none w-full px-3 py-2 bg-white border border-[#e6eaef] rounded-lg text-xs text-[#3f484c] outline-none focus:border-[#0040a1] transition-colors cursor-pointer pr-7"
                style={{ fontFamily: lexend, fontWeight: 400 }}
              >
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3f484c]"
                style={{ fontFamily: pjs }}
              >
                ▾
              </span>
            </div>
          </div>

          {/* Discount type + value row */}
          <div className="flex gap-2.5 w-full">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Discount Type</FieldLabel>
              <div className="flex items-center p-0.5 bg-[#f8f9fa] border border-[#e6eaef] rounded-lg">
                <button
                  type="button"
                  onClick={() => setDiscountType("percent")}
                  className={`flex-1 flex items-center justify-center px-4 py-1.5 rounded-md text-xs transition-all ${
                    discountType === "percent"
                      ? "bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06)] text-[#0040a1] font-bold"
                      : "text-[#3f484c] font-normal"
                  }`}
                  style={{ fontFamily: lexend }}
                >
                  Percent (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("amount")}
                  className={`flex-1 flex items-center justify-center px-4 py-1.5 rounded-md text-xs transition-all ${
                    discountType === "amount"
                      ? "bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06)] text-[#0040a1] font-bold"
                      : "text-[#3f484c] font-normal"
                  }`}
                  style={{ fontFamily: lexend }}
                >
                  Amount ($)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Value</FieldLabel>
              <div className="flex items-center px-3 py-2 bg-white border border-[#e6eaef] rounded-lg focus-within:border-[#0040a1] transition-colors">
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (!/[\d\.]/.test(e.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab"].includes(e.key)) e.preventDefault(); }}
                  className="text-xs font-semibold text-[#191c1d] bg-transparent outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ fontFamily: lexend }}
                />
                <span className="text-xs font-semibold text-[#3f484c] ml-1.5 shrink-0" style={{ fontFamily: lexend }}>
                  {discountType === "percent" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>

          {/* Usage limit */}
          <div className="flex flex-col gap-1 w-full">
            <FieldLabel>Usage Limit</FieldLabel>
            <div className="flex items-center px-3 py-2 bg-white border border-[#e6eaef] rounded-lg focus-within:border-[#0040a1] transition-colors">
              <input
                type="number"
                min={1}
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                onKeyDown={(e) => { if (!/[\d]/.test(e.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab"].includes(e.key)) e.preventDefault(); }}
                className="text-xs font-semibold text-[#191c1d] bg-transparent outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontFamily: lexend }}
              />
              <span className="text-xs font-semibold text-[#3f484c] ml-1.5 whitespace-nowrap shrink-0" style={{ fontFamily: lexend }}>
                redemptions
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center px-5 py-2 bg-white border border-[#e6eaef] rounded-full text-xs font-bold text-[#191c1d] hover:bg-gray-50 transition-colors"
              style={{ fontFamily: pjs }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center justify-center px-5 py-2 bg-[#0040a1] rounded-full text-xs font-bold text-white hover:bg-[#003090] transition-colors"
              style={{ fontFamily: pjs }}
            >
              Apply discount
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
