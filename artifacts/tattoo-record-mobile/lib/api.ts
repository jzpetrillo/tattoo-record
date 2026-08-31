import { Platform } from "react-native";

const configuredDomain = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = configuredDomain
  ? (configuredDomain.startsWith("http") ? configuredDomain : `https://${configuredDomain}`).replace(/\/+$/, "")
  : "";

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("/api/")) return url;
  return `${API_BASE}${url}`;
}

export function resolveMediaUrls<T>(value: T): T {
  if (typeof value === "string") {
    return resolveMediaUrl(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(resolveMediaUrls) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveMediaUrls(item)]),
    ) as T;
  }
  return value;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  if (!API_BASE && Platform.OS !== "web") {
    throw new Error("Mobile API configuration is missing. Rebuild with EXPO_PUBLIC_DOMAIN or EXPO_PUBLIC_API_URL.");
  }
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // The existing account system authenticates this client with an explicit
  // bearer token, not a session cookie. Omitting credentials keeps Expo Web
  // compatible with the API's wildcard CORS response and avoids sending any
  // unrelated browser cookies to the shared API origin.
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "omit" });
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.();
    let message = response.statusText;
    try {
      const body = await response.json() as { message?: string };
      message = body.message || message;
    } catch {
      // Keep the HTTP status when the API returns a non-JSON error.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export async function uploadMedia(uri: string, name: string, mimeType: string, folder: string, token: string) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) throw new Error("Could not prepare the selected file for upload.");
    form.append("file", await fileResponse.blob(), name);
  } else {
    form.append("file", { uri, name, type: mimeType } as unknown as Blob);
  }
  form.append("folder", folder);
  return api<{ url: string; publicId: string; resourceType?: string }>("/api/upload", {
    method: "POST",
    body: form,
  }, token);
}