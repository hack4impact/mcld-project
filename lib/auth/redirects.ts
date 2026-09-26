import { appOrigin } from "@/lib/app-url";

const PLACEHOLDER_ORIGIN = "http://localhost";

export function safeNextPath(raw: unknown, fallback = "/"): string {
   if (
      typeof raw !== "string" ||
      !raw.startsWith("/") ||
      raw.startsWith("//") ||
      raw.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(raw)
   ) {
      return fallback;
   }

   let url: URL;
   try {
      url = new URL(raw, PLACEHOLDER_ORIGIN);
   } catch {
      return fallback;
   }
   if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

   const path = `${url.pathname}${url.search}${url.hash}`;
   if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
   return path;
}

export function nextPathFromLink(raw: unknown, fallback = "/"): string {
   if (typeof raw !== "string") return fallback;
   if (raw.startsWith("/")) return safeNextPath(raw, fallback);

   let url: URL;
   try {
      url = new URL(raw);
   } catch {
      return fallback;
   }
   if (url.origin !== appOrigin()) return fallback;

   return safeNextPath(`${url.pathname}${url.search}${url.hash}`, fallback);
}
