export function cadStringToCents(raw: string): number | null {
   const n = Number.parseFloat(raw.trim().replace(",", "."));
   if (!Number.isFinite(n) || n < 0) return null;
   return Math.round(n * 100);
}
