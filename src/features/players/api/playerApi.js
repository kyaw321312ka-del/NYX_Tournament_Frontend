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
