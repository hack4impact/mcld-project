const MONTHS_SHORT = [
   "Jan", "Feb", "Mar", "Apr", "May", "Jun",
   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatDate(value: string): string {
   const [y, m, d] = value.split("-");
   return `${MONTHS_SHORT[Number(m) - 1]} ${Number(d)}, ${y}`;
}

export function formatDateFromInstant(d: Date): string {
   return formatDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
         d.getDate(),
      ).padStart(2, "0")}`,
   );
}
