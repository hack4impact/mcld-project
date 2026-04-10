/** Matches DB / API: `[{ "start": "ISO", "end": "ISO" }, ...]` */

export type ScheduledSlot = { start: string; end: string };

export function parseScheduledSlotsFromDb(value: unknown): ScheduledSlot[] {
   if (value == null) return [];
   let arr: unknown[];
   if (typeof value === "string") {
      try {
         const p: unknown = JSON.parse(value);
         arr = Array.isArray(p) ? p : [];
      } catch {
         return [];
      }
   } else if (Array.isArray(value)) {
      arr = value;
   } else {
      return [];
   }
   return arr
      .map((item) => {
         if (item && typeof item === "object" && "start" in item && "end" in item) {
            return {
               start: String((item as { start: unknown }).start),
               end: String((item as { end: unknown }).end),
            };
         }
         return null;
      })
      .filter((x): x is ScheduledSlot => x !== null);
}

/** For `datetime-local` value= */
export function isoToDatetimeLocal(iso: string): string {
   if (!iso.trim()) return "";
   const d = new Date(iso);
   if (Number.isNaN(d.getTime())) return "";
   const pad = (n: number) => String(n).padStart(2, "0");
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** From `datetime-local` onChange target.value */
export function datetimeLocalToIso(local: string): string {
   if (!local.trim()) return "";
   const d = new Date(local);
   if (Number.isNaN(d.getTime())) return "";
   return d.toISOString();
}

/** Hidden input value; empty string means “no JSON” for the form. */
export function slotsToJson(slots: ScheduledSlot[]): string {
   const valid = slots.filter((s) => s.start.trim() && s.end.trim());
   if (valid.length === 0) return "";
   const normalized = valid
      .map((s) => {
         const ds = new Date(s.start);
         const de = new Date(s.end);
         if (Number.isNaN(ds.getTime()) || Number.isNaN(de.getTime())) {
            return null;
         }
         return { start: ds.toISOString(), end: de.toISOString() };
      })
      .filter((x): x is { start: string; end: string } => x !== null);
   if (normalized.length === 0) return "";
   return JSON.stringify(normalized);
}
