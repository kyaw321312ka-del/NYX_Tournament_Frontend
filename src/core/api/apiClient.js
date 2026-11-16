import {
  clearSession,
  getAccessToken,
  SESSION_EXPIRED_EVENT,
} from "../../features/auth/session";

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
