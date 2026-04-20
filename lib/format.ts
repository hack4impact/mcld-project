const MONTHS_SHORT = [
   "Jan", "Feb", "Mar", "Apr", "May", "Jun",
   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatDate(value: string): string {
   const [y, m, d] = value.split("-");
   return `${MONTHS_SHORT[Number(m) - 1]} ${Number(d)}, ${y}`;
}
