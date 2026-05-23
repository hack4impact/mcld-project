"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  priceCents: number | null;
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

const TABLE_GRID = "grid grid-cols-[2fr_1fr_1fr_1fr_2.5rem]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[0.625rem] font-extrabold text-accent-foreground tracking-[0.6px] uppercase">
      {children}
    </Label>
  );
}

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
      <DialogContent className="sm:max-w-xl w-full p-0 gap-0 overflow-hidden bg-card">
        <DialogHeader className="px-7 pt-4 pb-3.5 gap-0.5 pr-14">
          <DialogTitle className="text-lg font-extrabold text-foreground leading-normal truncate">
            Discounts for {userName}
          </DialogTitle>
          <DialogDescription className="text-xs font-normal leading-normal">
            {userEmail ? `${userEmail}  ·  ${userRole}` : userRole}
          </DialogDescription>
        </DialogHeader>

        {/* Divider */}
        <div className="h-px w-full bg-border" />

        {/* Active Discounts */}
        <div className="flex flex-col gap-2 px-7 pt-4 pb-1.5">
          <h3 className="text-sm font-extrabold text-foreground leading-normal">
            Active discounts
          </h3>

          <div className="w-full rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className={`${TABLE_GRID} bg-accent`}>
              <div className="flex items-center h-8 px-3"><FieldLabel>Service</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Type</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Value</FieldLabel></div>
              <div className="flex items-center h-8 px-3"><FieldLabel>Used</FieldLabel></div>
              <div className="h-8" />
            </div>

            {/* Table rows */}
            <div className="max-h-[120px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-10">
                  <Spinner className="size-4 text-accent-foreground" />
                </div>
              ) : discounts.length === 0 ? (
                <div className="flex items-center justify-center h-10 text-xs font-normal text-muted-foreground">
                  No active discounts
                </div>
              ) : (
                discounts.map((discount, i) => (
                  <div
                    key={discount.id}
                    className={`${TABLE_GRID} ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}
                  >
                    <div className="flex items-center h-10 px-3 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {discount.service}
                      </span>
                    </div>
                    <div className="flex items-center h-10 px-3 min-w-0">
                      <span className="text-xs font-normal text-muted-foreground truncate">
                        {discount.type}
                      </span>
                    </div>
                    <div className="flex items-center h-10 px-3 min-w-0">
                      <span className="text-xs font-bold text-accent-foreground truncate">
                        {discount.value}
                      </span>
                    </div>
                    <div className="flex items-center h-10 px-3 min-w-0">
                      <span className="text-xs font-normal text-muted-foreground truncate">
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
                        className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
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
        </div>

        {/* Apply New Discount */}
        <div className="flex flex-col gap-3 px-7 py-4 bg-muted/50 border-t border-border">
          <h3 className="text-sm font-extrabold text-foreground leading-normal">
            Apply new discount
          </h3>

          {/* Service selector */}
          <div className="flex flex-col gap-1 w-full">
            <FieldLabel>Service</FieldLabel>
            <Select value={serviceId} onValueChange={setServiceId} disabled={submitting}>
              <SelectTrigger
                className="w-full h-auto px-3 py-2 bg-card border-input rounded-lg text-xs font-normal text-muted-foreground focus-visible:ring-0 focus-visible:border-ring"
              >
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.priceCents != null ? ` · $${(s.priceCents / 100).toFixed(2)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount type + value row */}
          <div className="flex gap-2.5 w-full">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Discount Type</FieldLabel>
              <div className="flex items-center p-0.5 bg-muted border border-border rounded-lg">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleTypeChange("percent")}
                  className={`flex-1 h-auto px-4 py-1.5 text-xs transition-all ${discountType === "percent"
                      ? "bg-card shadow-sm text-accent-foreground font-bold hover:bg-card hover:text-accent-foreground"
                      : "text-muted-foreground font-normal hover:bg-transparent hover:text-muted-foreground"
                    }`}
                >
                  Percent (%)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleTypeChange("amount")}
                  className={`flex-1 h-auto px-4 py-1.5 text-xs transition-all ${discountType === "amount"
                      ? "bg-card shadow-sm text-accent-foreground font-bold hover:bg-card hover:text-accent-foreground"
                      : "text-muted-foreground font-normal hover:bg-transparent hover:text-muted-foreground"
                    }`}
                >
                  Amount ($)
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <FieldLabel>Value</FieldLabel>
              <div className="flex items-center px-3 py-2 bg-card border border-input rounded-lg focus-within:border-ring transition-colors">
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
                  className="h-auto border-0 p-0 text-xs font-semibold text-foreground bg-transparent focus-visible:ring-0 focus-visible:border-0"
                />
                <span className="text-xs font-semibold text-muted-foreground ml-1.5 shrink-0">
                  {discountType === "percent" ? "%" : "$"}
                </span>
              </div>
            </div>
          </div>

          {/* After discount preview */}
          {(() => {
            const selected = services.find((s) => s.id === serviceId);
            if (!selected || selected.priceCents == null) return null;
            const numValue = Number(value);
            if (!value || isNaN(numValue) || numValue <= 0) return null;
            const afterCents = Math.max(
              0,
              discountType === "percent"
                ? selected.priceCents * (1 - numValue / 100)
                : selected.priceCents - numValue * 100,
            );
            return (
              <p className="text-xs text-muted-foreground -mt-1">
                After discount:{" "}
                <span className="font-semibold text-foreground">
                  ${(afterCents / 100).toFixed(2)}
                </span>
              </p>
            );
          })()}

          {/* Usage limit */}
          <div className="flex flex-col gap-1 w-full">
            <FieldLabel>Usage Limit</FieldLabel>
            <div className="flex items-center px-3 py-2 bg-card border border-input rounded-lg focus-within:border-ring transition-colors">
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
                className="h-auto border-0 p-0 text-xs font-semibold text-foreground bg-transparent focus-visible:ring-0 focus-visible:border-0"
              />
              <span className="text-xs font-semibold text-muted-foreground ml-1.5 whitespace-nowrap shrink-0">
                redemptions
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 p-0 border-t-0 bg-transparent rounded-none flex-row items-center justify-end gap-2 px-7 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => setIsOpen(false)}
            className="h-auto px-5 py-2 text-xs font-bold text-foreground border-border hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleApply}
            className="h-auto px-5 py-2 text-xs font-bold bg-accent-foreground hover:bg-accent-foreground/90 text-white"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Apply discount"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
