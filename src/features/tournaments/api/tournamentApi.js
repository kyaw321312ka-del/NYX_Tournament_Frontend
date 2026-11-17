import { apiRequest } from "../../../core/api/apiClient";

export async function getTournaments({ page = 1, pageSize = 20 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(`/tournaments?${query}`);

  if (response?.success !== true || !Array.isArray(response.data)) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid tournament list.",
    );
  }

  return {
    tournaments: response.data,
    pagination: response.pagination,
  };
}

export async function getTournament(id) {
  const response = await apiRequest(`/tournaments/${encodeURIComponent(id)}`);

  if (
    response?.success !== true ||
    !response.data ||
    String(response.data.id) !== String(id)
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned invalid tournament details.",
    );
  }

  return response.data;
}

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
