/** Public base URL of the app (catalog links, Open Graph). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** "https://jaay.app" → "jaay.app", for display. */
export function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, "");
}

export function catalogUrl(slug: string): string {
  return `${siteUrl()}/b/${slug}`;
}
