import { apiRequest } from "../../../core/api/apiClient";

function getErrorMessage(response, fallback) {
  return (
    (typeof response?.message === "string" && response.message) ||
    fallback
  );
}

function getSuccessfulData(response, fallback) {
  if (response?.success !== true || response.data == null) {
    throw new Error(getErrorMessage(response, fallback));
  }
  return response.data;
}

function ensureSuccess(response, fallback) {
  if (response?.success !== true) {
    throw new Error(getErrorMessage(response, fallback));
  }
}

export async function getEligibleRegistrations(categoryId) {
  const response = await apiRequest(
    `/admin/tournament-categories/${encodeURIComponent(categoryId)}/eligible-registrations`,
  );
  const data = getSuccessfulData(
    response,
    "The server returned an invalid eligible registrations response.",
  );
  const registrations = Array.isArray(data)
    ? data
    : data.registrations || data.eligibleRegistrations;
  if (!Array.isArray(registrations)) {
    throw new Error("The server returned an invalid eligible registrations list.");
  }
  return registrations;
}

export async function getCategoryDraws(categoryId) {
  let response;
  try {
    response = await apiRequest(
      `/admin/tournament-categories/${encodeURIComponent(categoryId)}/draws`,
    );
  } catch (error) {
    if (error?.status === 404) return [];
    throw error;
  }
  if (response?.success === true && response.data == null) {
    return [];
  }
  const data = getSuccessfulData(response, "Unable to load category draws.");
  if (data.draw === null || data.latestDraw === null) {
    return [];
  }
  const draws = Array.isArray(data)
    ? data
    : Array.isArray(data.draws)
      ? data.draws
      : data.latestDraw
        ? [data.latestDraw]
        : data.draw
          ? [data.draw]
          : data.id != null
            ? [data]
        : null;
  if (!draws) {
    throw new Error("The server returned an invalid category draws list.");
  }
  return draws;
}

export async function createCategoryDraw(categoryId) {
  const response = await apiRequest(
    `/admin/tournament-categories/${encodeURIComponent(categoryId)}/draws`,
    {
      method: "POST",
      body: JSON.stringify({
        drawFormat: "SINGLE_ELIMINATION",
        seedingMethod: "MANUAL",
      }),
    },
  );
  return getSuccessfulData(response, "The server did not create the draw.");
}

export async function getCategoryDraw(categoryId, drawId) {
  const response = await apiRequest(
    `/admin/tournament-categories/${encodeURIComponent(categoryId)}/draws/${encodeURIComponent(drawId)}`,
  );
  return getSuccessfulData(response, "Unable to refresh the draw.");
}

export async function assignDrawPositions(drawId, assignments) {
  const response = await apiRequest(
    `/admin/draws/${encodeURIComponent(drawId)}/positions`,
    {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    },
  );
  ensureSuccess(response, "The server did not save draw positions.");
  return response.data;
}

export async function publishCategoryDraw(drawId) {
  const response = await apiRequest(
    `/admin/draws/${encodeURIComponent(drawId)}/publish`,
    { method: "POST" },
  );
  if (response?.success !== true) {
    throw new Error(getErrorMessage(response, "The server did not publish the draw."));
  }
  return response.data;
}

export async function updateMatchResult(drawId, matchId, games) {
  const response = await apiRequest(
    `/admin/draws/${encodeURIComponent(drawId)}/matches/${encodeURIComponent(matchId)}/result`,
    {
      method: "PUT",
      body: JSON.stringify({ games }),
    },
  );
  ensureSuccess(response, "The server did not save the match result.");
  return response.data;
}

export async function finalizeCategoryDraw(drawId) {
  const response = await apiRequest(
    `/admin/draws/${encodeURIComponent(drawId)}/finalize-results`,
    { method: "POST" },
  );
  ensureSuccess(
    response,
    "The server did not finalize tournament results.",
  );
  return response.data;
}

export async function getCategoryRankingPointAwards(categoryId) {
  const response = await apiRequest(
    `/admin/tournament-categories/${encodeURIComponent(categoryId)}/ranking-point-awards`,
  );
  const data = getSuccessfulData(
    response,
    "Unable to load ranking-point awards.",
  );
  const awards = Array.isArray(data)
    ? data
    : data.awards || data.rankingPointAwards;
  if (!Array.isArray(awards)) {
    throw new Error("The server returned an invalid ranking-point awards list.");
  }
  return awards;
}
