import {
  clearSession,
  getAccessToken,
  SESSION_EXPIRED_EVENT,
} from "../../features/auth/utils/session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export function resolveApiAssetUrl(assetPath) {
  if (!assetPath) {
    return "";
  }
  if (/^https?:\/\//i.test(assetPath) || !API_BASE_URL) {
    return assetPath;
  }
  return new URL(assetPath, `${API_BASE_URL}/`).toString();
}

export async function apiAssetRequest(assetPath) {
  if (!API_BASE_URL) {
    throw new Error("Set VITE_API_BASE_URL in the build environment.");
  }
  if (!assetPath) {
    throw new Error("An asset path is required.");
  }

  const headers = new Headers();
  const token = getAccessToken();
  if (!token) {
    throw new Error("Admin authentication is required. Sign in again.");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const assetUrl = new URL(
    resolveApiAssetUrl(assetPath),
    window.location.origin,
  );
  const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
  if (assetUrl.origin !== apiOrigin) {
    throw new Error("Identity document URL must use the API host.");
  }

  const response = await fetch(assetUrl, { headers });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) {
    throw new Error(`Unable to load identity document (${response.status}).`);
  }

  return response.blob();
}

export async function apiRequest(
  path,
  { authenticated = true, headers: requestHeaders, ...options } = {},
) {
  if (!API_BASE_URL) {
    throw new Error("Set VITE_API_BASE_URL in the build environment.");
  }

  const headers = new Headers(requestHeaders);
  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = authenticated ? getAccessToken() : null;
  if (authenticated && !token) {
    throw new Error("Admin authentication is required. Sign in again.");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}
