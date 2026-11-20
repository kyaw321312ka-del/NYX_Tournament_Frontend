import { apiRequest } from "../../../core/api/apiClient";

export async function getAdminPlayers({ page = 1, pageSize = 20 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(`/admin/users?${query}`);

  if (
    response?.success !== true ||
    !Array.isArray(response.data) ||
    response.data.some(
      (player) =>
        !player ||
        player.id == null ||
        typeof player.athleteName !== "string" ||
        typeof player.contactEmail !== "string" ||
        (player.status != null && typeof player.status !== "string"),
    )
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid player list.",
    );
  }

  return {
    players: response.data,
    pagination: response.pagination || {
      page,
      pageSize,
      total: response.data.length,
      pageCount: 1,
    },
  };
}

export async function getAdminPlayer(id) {
  if (id == null || String(id).trim() === "") {
    throw new Error("A player ID is required.");
  }

  const response = await apiRequest(
    `/admin/users/${encodeURIComponent(id)}`,
  );
  if (
    response?.success !== true ||
    !response.data ||
    typeof response.data !== "object" ||
    Array.isArray(response.data)
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned invalid player details.",
    );
  }

  return response.data;
}

export async function updateIdentityDocumentStatus(id, verificationStatus) {
  if (id == null || String(id).trim() === "") {
    throw new Error("A player ID is required.");
  }
  if (!["approved", "rejected"].includes(verificationStatus)) {
    throw new Error("Verification status must be approved or rejected.");
  }

  const response = await apiRequest(
    `/users/${encodeURIComponent(id)}/identity-documents/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ verificationStatus }),
    },
  );
  if (response?.success === false) {
    throw new Error(
      (typeof response.message === "string" && response.message) ||
        "Unable to update identity-document status.",
    );
  }

  const updatedStatus =
    response?.data?.verificationStatus ?? response?.verificationStatus;
  return typeof updatedStatus === "string" ? updatedStatus : verificationStatus;
}
