const API_KEY_STORAGE = "broadcast_api_key";
const ADMIN_TOKEN_STORAGE = "admin_jwt";
const ADMIN_USER_ID_STORAGE = "admin_user_id";
const ADMIN_USERNAME_STORAGE = "admin_username";

const RAW_API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.BASE_URL ??
  "";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleaned = path.replace(/^\/+/, "");
  if (!API_BASE) {
    return `/${cleaned}`;
  }
  return `${API_BASE}/${cleaned}`;
}

export function getStoredApiKey(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
}

export function setStoredApiKey(value: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (!value) {
    localStorage.removeItem(API_KEY_STORAGE);
  } else {
    localStorage.setItem(API_KEY_STORAGE, value.trim());
  }
}

export function getStoredAdminToken(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_TOKEN_STORAGE) || "").trim();
}

export function getStoredAdminUserId(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_USER_ID_STORAGE) || "").trim();
}

export function storeAdminSession(data: {
  token?: string | null;
  admin_user_id?: number | null;
  username?: string | null;
}): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (data.token) {
    localStorage.setItem(ADMIN_TOKEN_STORAGE, data.token);
  }
  if (Number.isFinite(data.admin_user_id)) {
    localStorage.setItem(ADMIN_USER_ID_STORAGE, String(data.admin_user_id));
  }
  if (data.username) {
    localStorage.setItem(ADMIN_USERNAME_STORAGE, data.username);
  }
}

export function getStoredAdminUsername(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return (localStorage.getItem(ADMIN_USERNAME_STORAGE) || "").trim();
}

export function clearAdminSession(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(ADMIN_TOKEN_STORAGE);
  localStorage.removeItem(ADMIN_USER_ID_STORAGE);
  localStorage.removeItem(ADMIN_USERNAME_STORAGE);
}

export async function ensureAdminToken(): Promise<string> {
  const existing = getStoredAdminToken();
  if (existing) {
    return existing;
  }
  try {
    const response = await fetch(buildApiUrl("api/admin/token"), {
      credentials: "same-origin",
    });
    const data = await readJson<any>(response);
    if (!response.ok || !data?.token) {
      return "";
    }
    storeAdminSession(data);
    return data.token;
  } catch {
    return "";
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const apiKey = getStoredApiKey();
  if (apiKey && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", apiKey);
  }
  return fetch(buildApiUrl(path), {
    credentials: "same-origin",
    ...options,
    headers,
  });
}

export async function adminFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = await ensureAdminToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(buildApiUrl(path), {
    credentials: "same-origin",
    ...options,
    headers,
  });
}

export async function readJson<T>(response: Response): Promise<T | null> {
  try {
    const data = (await response.json()) as any;
    if (data && typeof data === "object" && "detail" in data) {
      const formatted = formatApiErrorDetail((data as any).detail);
      if (formatted) {
        (data as any).detail = formatted;
      }
    }
    return data as T;
  } catch {
    return null;
  }
}

function formatApiErrorDetail(detail: unknown): string | null {
  if (!detail) {
    return null;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (detail instanceof Error) {
    return detail.message || null;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => formatApiErrorEntry(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length) {
      return messages.join("; ");
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return null;
    }
  }
  if (typeof detail === "object") {
    const message = formatApiErrorEntry(detail);
    if (message) {
      return message;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return null;
    }
  }
  return null;
}

function formatApiErrorEntry(entry: unknown): string | null {
  if (!entry) {
    return null;
  }
  if (typeof entry === "string") {
    return entry;
  }
  if (entry instanceof Error) {
    return entry.message || null;
  }
  if (typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const message =
      (typeof record.msg === "string" && record.msg) ||
      (typeof record.message === "string" && record.message) ||
      (typeof record.detail === "string" && record.detail) ||
      (typeof record.error === "string" && record.error) ||
      "";
    const locValue = record.loc;
    const loc = Array.isArray(locValue)
      ? locValue.map((item) => String(item)).join(".")
      : typeof locValue === "string"
      ? locValue
      : "";
    if (message) {
      return loc ? `${loc}: ${message}` : message;
    }
  }
  return null;
}

export function parseList(value: string): string[] {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDateTime(value?: string | null): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromInputDateTime(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}
