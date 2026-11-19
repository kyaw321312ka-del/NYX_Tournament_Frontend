import { apiRequest } from "../../../core/api/apiClient";

function getErrorMessage(response, fallback) {
  return (
    (typeof response?.message === "string" && response.message) ||
    fallback
  );
}

export async function createTournamentRegistration(tournamentCategoryId) {
  const response = await apiRequest("/registrations", {
    method: "POST",
    body: JSON.stringify({ tournamentCategoryId }),
  });

  const registrationId =
    response?.data?.id ?? response?.data?.registrationId;
  if (response?.success !== true || registrationId == null) {
    throw new Error(
      getErrorMessage(
        response,
        "The server did not return a registration ID.",
      ),
    );
  }

  return { ...response.data, id: registrationId };
}

export async function createPartnerInvitation(
  tournamentCategoryId,
  partnerEmail,
) {
  const response = await apiRequest("/registrations/partner-invitations", {
    method: "POST",
    body: JSON.stringify({ tournamentCategoryId, partnerEmail }),
  });

  if (
    response?.success !== true ||
    response.data?.id == null ||
    response.data?.invitedUserId == null
  ) {
    throw new Error(
      getErrorMessage(
        response,
        "The server did not confirm the partner invitation.",
      ),
    );
  }

  return response.data;
}

export async function getPartnerInvitations(
  direction,
  { page = 1, pageSize = 20 } = {},
) {
  if (!["sent", "received"].includes(direction)) {
    throw new Error("Invitation direction must be sent or received.");
  }

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(
    `/registrations/partner-invitations/${direction}?${query}`,
  );

  if (response?.success !== true || !Array.isArray(response.data)) {
    throw new Error(
      getErrorMessage(
        response,
        `The server returned an invalid ${direction} invitations list.`,
      ),
    );
  }

  return {
    invitations: response.data,
    pagination: response.pagination || {
      page,
      pageSize,
      total: response.data.length,
      pageCount: 1,
    },
  };
}

export async function respondToPartnerInvitation(invitationId, action) {
  if (!["accept", "decline", "cancel"].includes(action)) {
    throw new Error("Unsupported partner invitation action.");
  }

  const response = await apiRequest(
    `/registrations/partner-invitations/${encodeURIComponent(invitationId)}/${action}`,
    { method: "POST" },
  );

  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(
        response,
        `The server did not confirm the invitation ${action}.`,
      ),
    );
  }

  return response.data;
}

export async function getMyRegistrations({ page = 1, pageSize = 20 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(`/registrations/mine?${query}`);

  if (response?.success !== true || !Array.isArray(response.data)) {
    throw new Error(
      getErrorMessage(
        response,
        "The server returned an invalid registration list.",
      ),
    );
  }

  return response.data;
}

export async function submitRegistrationPayment({
  registrationId,
  paymentMethodId,
  transactionReference,
  proof,
}) {
  const formData = new FormData();
  formData.append("paymentMethodId", String(paymentMethodId));
  if (transactionReference?.trim()) {
    formData.append("transactionReference", transactionReference.trim());
  }
  formData.append("proof", proof, proof.name);

  const response = await apiRequest(
    `/registrations/${encodeURIComponent(registrationId)}/payments`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(response, "The server did not confirm payment submission."),
    );
  }

  return response;
}
