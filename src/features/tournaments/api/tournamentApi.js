import { apiRequest } from "../../../core/api/apiClient";

export async function createTournament(tournament, banner) {
  const formData = new FormData();
  formData.append("tournament", JSON.stringify(tournament));
  formData.append("banner", banner, banner.name);

  const response = await apiRequest("/tournaments", {
    method: "POST",
    body: formData,
  });

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm tournament creation.",
    );
  }

  return response;
}
