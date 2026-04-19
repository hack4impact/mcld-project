export function cadStringToCents(raw: string): number | null {
   const n = Number.parseFloat(raw.trim().replace(",", "."));
   if (!Number.isFinite(n) || n < 0) return null;
   return Math.round(n * 100);
}

export function centsToMoneyString(cents: number | null): string {
   if (cents === null) return "";
   return (cents / 100).toFixed(2);
}
