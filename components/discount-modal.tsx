"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  loading?: boolean;
  onApply?: (data: {
    serviceId: string;
    type: "percent" | "amount";
    value: number;
    usageLimit: number;
  }) => void | Promise<void>;
  onRemove?: (id: string) => void | Promise<void>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// todo: apply the fonts to the entire project rather than here
const pjs = "'Plus Jakarta Sans', sans-serif";
const lexend = "'Lexend', sans-serif";

const TABLE_GRID = "grid grid-cols-[2fr_1fr_1fr_1fr_2.5rem]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label
      className="text-[0.625rem] font-extrabold text-[#00327d] tracking-[0.6px] uppercase"
      style={{ fontFamily: pjs }}
    >
      {children}
    </Label>
  );
}

// todo: use project's design system for colors
export function DiscountModal({
  userName,
  userEmail,
  userRole,
  discounts = [],
  services = [],
  loading = false,
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
  const [submitting, setSubmitting] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const handleTypeChange = (type: "percent" | "amount") => {
    setDiscountType(type);
    if (type === "percent") {
      // strip any decimal portion when switching to percent
      setValue((v) => String(Math.round(Number(v) || 0)));
    }
  };

  const handleValueChange = (raw: string) => {
    if (discountType === "percent") {
      if (!/^\d*$/.test(raw)) return;
      if (raw !== "" && Number(raw) > 100) { setValue("100"); return; }
      setValue(raw);
    } else {
      if (/^\d*\.?\d{0,2}$/.test(raw)) setValue(raw);
    }
  };

  const handleUsageLimitChange = (raw: string) => {
    if (/^\d*$/.test(raw)) setUsageLimit(raw);
  };

  const handleApply = async () => {
    setSubmitting(true);
    try {
      await onApply?.({
        serviceId,
        type: discountType,
        value: Number(value),
        usageLimit: Number(usageLimit),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl w-full p-0 gap-0 rounded-[2rem] shadow-[0px_18px_48px_0px_rgba(0,0,0,0.18)] overflow-hidden ring-0 border-0 bg-white"
      >
        <DialogTitle className="sr-only">Discounts for {userName}</DialogTitle>
        <DialogDescription className="sr-only">Manage and apply discounts for {userName}</DialogDescription>

        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] items-center px-7 pt-4 pb-3.5 gap-4">
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
              {userEmail ? `${userEmail}  ·  ${userRole}` : userRole}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsOpen(false)}
            className="rounded-full bg-[#f8f9fa] text-[#191c1d] hover:bg-[#e9ecef] shrink-0 text-sm font-semibold"
            style={{ fontFamily: pjs }}
            aria-label="Close"
          >
            ✕
          </Button>
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
            {loading ? (
              <div className="flex items-center justify-center h-10">
                <Spinner className="size-4 text-[#0040a1]" />
              </div>
            ) : discounts.length === 0 ? (
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
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      disabled={removingId === discount.id || submitting}
                      onClick={async () => {
                        setRemovingId(discount.id);
                        try { await onRemove?.(discount.id); }
                        finally { setRemovingId(null); }
                      }}
                      className="rounded-full bg-[#fef2f2] text-red-500 hover:bg-red-100 hover:text-red-500"
                      aria-label={`Remove discount for ${discount.service}`}
                    >
                      {removingId === discount.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                    </Button>
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
            <Select value={serviceId} onValueChange={setServiceId} disabled={submitting}>
              <SelectTrigger
                className="w-full h-auto px-3 py-2 bg-white border-[#e6eaef] rounded-lg text-xs text-[#3f484c] focus-visible:ring-0 focus-visible:border-[#0040a1]"
                style={{ fontFamily: lexend, fontWeight: 400 }}
              >
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id} style={{ fontFamily: lexend }}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount type + value row */}
          <div className="flex gap-2.5 w-full">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Discount Type</FieldLabel>
              <div className="flex items-center p-0.5 bg-[#f8f9fa] border border-[#e6eaef] rounded-lg">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleTypeChange("percent")}
                  className={`flex-1 h-auto px-4 py-1.5 rounded-md text-xs transition-all ${
                    discountType === "percent"
                      ? "bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06)] text-[#0040a1] font-bold hover:bg-white hover:text-[#0040a1]"
                      : "text-[#3f484c] font-normal hover:bg-transparent hover:text-[#3f484c]"
                  }`}
                  style={{ fontFamily: lexend }}
                >
                  Percent (%)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleTypeChange("amount")}
                  className={`flex-1 h-auto px-4 py-1.5 rounded-md text-xs transition-all ${
                    discountType === "amount"
                      ? "bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06)] text-[#0040a1] font-bold hover:bg-white hover:text-[#0040a1]"
                      : "text-[#3f484c] font-normal hover:bg-transparent hover:text-[#3f484c]"
                  }`}
                  style={{ fontFamily: lexend }}
                >
                  Amount ($)
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Value</FieldLabel>
              <div className="flex items-center px-3 py-2 bg-white border border-[#e6eaef] rounded-lg focus-within:border-[#0040a1] transition-colors">
                <Input
                  type="text"
                  inputMode={discountType === "percent" ? "numeric" : "decimal"}
                  value={value}
                  disabled={submitting}
                  onChange={(e) => handleValueChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey) return;
                    const nav = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                    if (nav.includes(e.key)) return;
                    if (discountType === "percent" && !/^\d$/.test(e.key)) e.preventDefault();
                    if (discountType === "amount" && !/^[\d.]$/.test(e.key)) e.preventDefault();
                  }}
                  className="h-auto border-0 p-0 text-xs font-semibold text-[#191c1d] bg-transparent focus-visible:ring-0 focus-visible:border-0"
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
              <Input
                type="text"
                inputMode="numeric"
                value={usageLimit}
                disabled={submitting}
                onChange={(e) => handleUsageLimitChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.ctrlKey || e.metaKey) return;
                  const nav = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                  if (nav.includes(e.key)) return;
                  if (!/^\d$/.test(e.key)) e.preventDefault();
                }}
                className="h-auto border-0 p-0 text-xs font-semibold text-[#191c1d] bg-transparent focus-visible:ring-0 focus-visible:border-0"
                style={{ fontFamily: lexend }}
              />
              <span className="text-xs font-semibold text-[#3f484c] ml-1.5 whitespace-nowrap shrink-0" style={{ fontFamily: lexend }}>
                redemptions
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setIsOpen(false)}
              className="h-auto px-5 py-2 rounded-full text-xs font-bold text-[#191c1d] border-[#e6eaef] hover:bg-gray-50"
              style={{ fontFamily: pjs }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleApply}
              className="h-auto px-5 py-2 rounded-full text-xs font-bold bg-[#0040a1] hover:bg-[#003090] text-white"
              style={{ fontFamily: pjs }}
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Apply discount"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
