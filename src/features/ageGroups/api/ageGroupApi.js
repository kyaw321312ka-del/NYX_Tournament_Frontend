import { apiRequest } from "../../../core/api/apiClient";

function getErrorMessage(response, fallback) {
  return (
    (typeof response?.message === "string" && response.message) ||
    fallback
  );
}

export async function getAgeGroups() {
  const response = await apiRequest("/age-groups", { authenticated: false });
  if (
    response?.success !== true ||
    !Array.isArray(response.data) ||
    response.data.some(
      (ageGroup) =>
        !ageGroup ||
        ageGroup.id == null ||
        typeof ageGroup.name !== "string" ||
        !Number.isFinite(Number(ageGroup.age)),
    )
  ) {
    throw new Error(
      getErrorMessage(response, "The server returned an invalid age group list."),
    );
  }
  return response.data;
}

export async function getAgeGroup(id) {
  const response = await apiRequest(
    `/age-groups/${encodeURIComponent(id)}`,
    { authenticated: false },
  );
  if (
    response?.success !== true ||
    !response.data ||
    typeof response.data !== "object" ||
    Array.isArray(response.data)
  ) {
    throw new Error(
      getErrorMessage(response, "The server returned an invalid age group."),
    );
  }
  return response.data;
}

export async function createAgeGroup({ name, age }) {
  const response = await apiRequest("/age-groups", {
    method: "POST",
    body: JSON.stringify({ name, age }),
  });
  if (response?.success !== true || !response.data || response.data.id == null) {
    throw new Error(
      getErrorMessage(response, "The server did not confirm age group creation."),
    );
  }
  return response.data;
}

export async function updateAgeGroup(id, { name, age }) {
  const response = await apiRequest(`/age-groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name, age }),
  });
  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(response, "The server did not confirm the age group update."),
    );
  }
  return response.data;
}

export async function deleteAgeGroup(id) {
  const response = await apiRequest(`/age-groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(response, "The server did not confirm age group deletion."),
    );
  }
  return response;
}
