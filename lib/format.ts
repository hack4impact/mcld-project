export function formatDate(value: Date | string) {
   const date = value instanceof Date ? value : new Date(value);
   return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
   });
}
