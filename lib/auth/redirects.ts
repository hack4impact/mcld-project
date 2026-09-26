import { appOrigin } from "@/lib/app-url";

const PLACEHOLDER_ORIGIN = "http://localhost";

/**
 * Returns `raw` when it's a path on this site (e.g. `/checkout/abc?x=1`), and
 * `fallback` otherwise. Blocks open redirects such as `//evil.com`,
 * `/\evil.com` (browsers read `\` as `/`) and absolute URLs.
 */
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

   return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Like `safeNextPath`, but also accepts an absolute URL on this app. Email
 * templates pass `{{ .RedirectTo }}`, which Supabase always makes absolute.
 */
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
