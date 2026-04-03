/**
 * Resolve a small site icon from a public HTTPS URL (standard favicon CDN by hostname).
 * Safe, read-only branding — no credentials or private APIs.
 */
export function faviconUrlFromHref(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=64`;
  } catch {
    return null;
  }
}
