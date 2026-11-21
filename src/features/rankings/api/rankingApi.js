import { apiRequest } from "../../../core/api/apiClient";

export async function getCategoryLeaderboard(
  categoryId,
  { authenticated = true } = {},
) {
  if (categoryId == null || String(categoryId).trim() === "") {
    throw new Error("A tournament category is required to load its leaderboard.");
  }

  const response = await apiRequest(
    `/tournament-categories/${encodeURIComponent(categoryId)}/leaderboard`,
    { authenticated },
  );
  const data = response?.data;
  if (
    response?.success !== true ||
    !data ||
    !Array.isArray(data.entries) ||
    data.entries.some(
      (entry) =>
        entry?.registrationId == null ||
        entry?.player?.id == null ||
        typeof entry?.player?.name !== "string" ||
        entry?.position == null ||
        typeof entry?.label !== "string" ||
        !Number.isFinite(Number(entry?.points)),
    )
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid category leaderboard.",
    );
  }

  return data;
}
