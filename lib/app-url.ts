/** Absolute URL on this app, from APP_URL (e.g. for links in emails). */
export function appUrl(path: string): string {
   const base = (process.env.APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
   );
   return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function appOrigin(): string {
   return new URL(appUrl("/")).origin;
}
