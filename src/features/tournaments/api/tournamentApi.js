import { apiRequest } from "../../../core/api/apiClient";

export async function getTournamentCategories({ authenticated = true } = {}) {
  const response = await apiRequest("/auth/categories", { authenticated });

  if (
    response?.success !== true ||
    !Array.isArray(response.data) ||
    response.data.some(
      (category) =>
        category.id == null ||
        typeof category.categoryCode !== "string" ||
        typeof category.name !== "string" ||
        typeof category.pairingType !== "string",
    )
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid category list.",
    );
  }

  return response.data;
}

export async function getTournaments({
  page = 1,
  pageSize = 20,
  authenticated = false,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(`/tournaments?${query}`, {
    authenticated,
  });

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

export async function publishTournament(id) {
  const response = await apiRequest(
    `/tournaments/${encodeURIComponent(id)}/publish`,
    { method: "POST" },
  );

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm tournament publication.",
    );
  }

  return response;
}

export async function createTournament(tournament, banner = null) {
  let body;
  if (banner) {
    body = new FormData();
    body.append("tournament", JSON.stringify(tournament));
    body.append("banner", banner, banner.name);
  } else {
    body = JSON.stringify(tournament);
  }

  const response = await apiRequest("/tournaments", {
    method: "POST",
    body,
  });

  if (response?.success !== true || response.data?.id == null) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not return the created tournament ID.",
    );
  }

  return response.data;
}

export async function updateTournament(id, tournament, banner) {
  const formData = new FormData();
  formData.append("tournament", JSON.stringify(tournament));
  if (banner) {
    formData.append("banner", banner, banner.name);
  }

  const response = await apiRequest(
    `/tournaments/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: formData,
    },
  );

  if (response?.success !== true || !response.data) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm tournament updates.",
    );
  }

  return response.data;
}
