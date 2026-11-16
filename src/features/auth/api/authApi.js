import { apiRequest } from "../../../core/api/apiClient";

export async function login(credentials) {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify(credentials),
  });

  if (
    response?.success !== true ||
    typeof response.data?.token !== "string" ||
    !response.data.user ||
    typeof response.data.user.role !== "string"
  ) {
    const message =
      (typeof response?.message === "string" && response.message) ||
      "The login response did not contain a valid session.";
    throw new Error(message);
  }

  return {
    token: response.data.token,
    user: response.data.user,
  };
}

export async function logout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser() {
  const response = await apiRequest("/auth/me");
  if (
    response?.success !== true ||
    !response.data?.user ||
    typeof response.data.user.role !== "string"
  ) {
    const message =
      (typeof response?.message === "string" && response.message) ||
      "The profile response did not contain valid user data.";
    throw new Error(message);
  }

  return response.data.user;
}
