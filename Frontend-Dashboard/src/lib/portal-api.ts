/** Django portal + auth API client (JWT). */

export const STORAGE_ACCESS = "syndicate_access";
export const STORAGE_REFRESH = "syndicate_refresh";

export type PortalUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  roles: { name: string; display_name: string }[];
  permissions: string[];
};

/**
 * When unset, empty, or "proxy", the browser calls same-origin `/api/portal-proxy/...`
 * and Next.js forwards to Django (avoids 404/CORS/mobile quirks hitting :8000 directly).
 * Set to a full URL (e.g. http://127.0.0.1:8000) only if you need direct browser → Django.
 */
function useNextProxy(): boolean {
  const v = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().toLowerCase();
  return v === "" || v === "proxy";
}

/**
 * Django `APPEND_SLASH` expects `/api/.../resource/?q=` not `/api/.../resource?q=`.
 * Normalizes only the path segment before `?` so query params are never corrupted.
 */
function normalizeDjangoApiPath(apiPath: string): string {
  const raw = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const qIdx = raw.indexOf("?");
  const pathOnly = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const query = qIdx === -1 ? "" : raw.slice(qIdx + 1);
  const withSlash = pathOnly.endsWith("/") ? pathOnly : `${pathOnly}/`;
  return query ? `${withSlash}?${query}` : withSlash;
}

/** Build fetch URL for an API path like `/api/auth/login/`. */
export function resolveClientApiUrl(apiPath: string): string {
  if (apiPath.startsWith("http://") || apiPath.startsWith("https://")) return apiPath;
  const normalized = normalizeDjangoApiPath(apiPath);
  if (typeof window === "undefined") {
    const base = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
    return `${base}${normalized}`;
  }
  if (!useNextProxy()) {
    let base = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
    // Misconfiguration: pointing at the Next dev server causes /api/portal/... 404s (no Django there).
    if (
      base &&
      typeof window !== "undefined" &&
      (base.includes(":3000") || base === window.location.origin)
    ) {
      base = "";
    }
    if (!base) {
      const withoutApi = normalized.replace(/^\/api\//, "");
      return `/api/portal-proxy/${withoutApi}`;
    }
    return `${base}${normalized}`;
  }
  const withoutApi = normalized.replace(/^\/api\//, "");
  return `/api/portal-proxy/${withoutApi}`;
}

/** Hint text for login / errors (human-readable). */
export function getApiDisplayHint(): string {
  if (!useNextProxy()) {
    return (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "") || "not configured";
  }
  return "Next.js proxy → Django (BACKEND_INTERNAL_URL or http://127.0.0.1:8000)";
}

/** @deprecated Use getApiDisplayHint(); kept for older imports. */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    return (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
  }
  if (!useNextProxy()) {
    return (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
  }
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function authRequired(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_REQUIRED !== "false";
}

export function readStoredAccess(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_ACCESS);
}

export function readStoredRefresh(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_REFRESH);
}

export function persistTokens(access: string, refresh: string) {
  window.localStorage.setItem(STORAGE_ACCESS, access);
  window.localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens() {
  window.localStorage.removeItem(STORAGE_ACCESS);
  window.localStorage.removeItem(STORAGE_REFRESH);
}

export function hasPermission(permissions: string[] | undefined, codename: string): boolean {
  if (!permissions?.length) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(codename);
}

export type LoginResponse = {
  access: string;
  refresh: string;
  user: PortalUser;
};

function formatAuthErrorPayload(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.non_field_errors) && d.non_field_errors.length)
      return String(d.non_field_errors[0]);
    if (typeof d.username === "string") return d.username;
    if (Array.isArray(d.username) && d.username.length) return String(d.username[0]);
    if (typeof d.password === "string") return d.password;
    if (Array.isArray(d.password) && d.password.length) return String(d.password[0]);
  }
  if (status === 401) return "No account found or wrong password.";
  return "Login failed.";
}

async function parseJsonOrText(res: Response): Promise<{ json: unknown; raw: string }> {
  const raw = await res.text();
  if (!raw) return { json: {}, raw: "" };
  try {
    return { json: JSON.parse(raw) as unknown, raw };
  } catch {
    return { json: {}, raw };
  }
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const url = resolveClientApiUrl("/api/auth/login/");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
      credentials: "omit"
    });
  } catch {
    throw new Error(
      `Cannot reach API (${getApiDisplayHint()}). Start Next and Django, or set NEXT_PUBLIC_API_BASE to your backend URL.`
    );
  }
  const { json: parsed, raw } = await parseJsonOrText(res);
  const data = parsed as LoginResponse & { detail?: string };
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `Login endpoint returned 404. Django has no /api/auth/login/ — save syndicate_backend/urls.py, restart runserver, or set BACKEND_INTERNAL_URL if Django is not on 127.0.0.1:8000.`
      );
    }
    if (res.status === 403 && raw.toLowerCase().includes("csrf")) {
      throw new Error(
        "Login blocked (CSRF). Backend was updated to exempt JWT login — restart Django (runserver)."
      );
    }
    const msg = formatAuthErrorPayload(parsed, res.status);
    if (msg === "Login failed." && raw.length && raw.length < 400) {
      throw new Error(`${msg} (${res.status}): ${raw}`);
    }
    throw new Error(msg);
  }
  if (!data.access || !data.refresh) {
    throw new Error(
      `Invalid login response (missing tokens). Status ${res.status}. First bytes: ${raw.slice(0, 120)}`
    );
  }
  return data;
}

export async function refreshRequest(refresh: string): Promise<{ access: string }> {
  const res = await fetch(resolveClientApiUrl("/api/auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh })
  });
  const data = (await res.json().catch(() => ({}))) as { access?: string; detail?: string };
  if (!res.ok || !data.access) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Refresh failed");
  }
  return { access: data.access };
}

export async function meRequest(accessToken: string): Promise<PortalUser> {
  const res = await fetch(resolveClientApiUrl("/api/auth/me/"), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = (await res.json().catch(() => ({}))) as PortalUser & { detail?: string };
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Not authenticated");
  }
  return data as PortalUser;
}

export async function logoutRequest(accessToken: string): Promise<void> {
  await fetch(resolveClientApiUrl("/api/auth/logout/"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

/**
 * Fetch a binary PDF (membership article) with JWT. Use blob URLs for inline viewing.
 */
export async function fetchAuthenticatedPdfBlob(apiPath: string): Promise<Blob> {
  const url = resolveClientApiUrl(apiPath.startsWith("/") ? apiPath : `/${apiPath}`);
  const headers = new Headers();
  const at = readStoredAccess();
  if (at) headers.set("Authorization", `Bearer ${at}`);
  const res = await fetch(url, { headers, credentials: "omit" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 240) || `PDF request failed (${res.status})`);
  }
  return res.blob();
}

export async function portalFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean }
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = path.startsWith("http") ? path : resolveClientApiUrl(path.startsWith("/") ? path : `/${path}`);
  const headers = new Headers(init?.headers);
  if (!init?.skipAuth) {
    const at = readStoredAccess();
    if (at) headers.set("Authorization", `Bearer ${at}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  let data: T = undefined as T;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as T;
    }
  }
  return { ok: res.ok, status: res.status, data };
}
