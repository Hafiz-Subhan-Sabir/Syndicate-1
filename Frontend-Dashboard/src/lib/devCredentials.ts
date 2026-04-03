/**
 * Dev login copy for the UI. Prefer NEXT_PUBLIC_DEMO_* in .env.local (see .env.local.example).
 * Must match Backend seed_portal / PORTAL_DEV_PASSWORD default.
 */
const FALLBACK_USER = "demo";
const FALLBACK_PASS = "SyndicateDev2026!";

export function getDevLoginUsername(): string {
  return (process.env.NEXT_PUBLIC_DEMO_USERNAME || FALLBACK_USER).trim();
}

export function getDevLoginPassword(): string {
  return (process.env.NEXT_PUBLIC_DEMO_PASSWORD || FALLBACK_PASS).trim();
}

export function getDevLoginLine(): string {
  return `${getDevLoginUsername()} / ${getDevLoginPassword()}`;
}
