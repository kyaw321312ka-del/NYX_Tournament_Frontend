import { apiRequest } from "../../../core/api/apiClient";

async function fetchPaymentMethods(path) {
  const response = await apiRequest(path);
  if (response?.success !== true || !Array.isArray(response.data)) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid payment method list.",
    );
  }

  return response.data;
}

export async function getPaymentMethods() {
  return fetchPaymentMethods("/admin/payment-methods");
}

export async function getEnrollmentPaymentMethods() {
  return fetchPaymentMethods("/payment-methods");
}

export async function getPendingPayments({ page = 1, pageSize = 20 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await apiRequest(`/admin/payments/pending?${query}`);
  if (
    response?.success !== true ||
    !Array.isArray(response.data) ||
    response.data.some((payment) => !payment || payment.id == null)
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server returned an invalid pending payment list.",
    );
  }

  return {
    payments: response.data,
    pagination: response.pagination || {
      page,
      pageSize,
      total: response.data.length,
      pageCount: 1,
    },
  };
}

export async function verifyPayment(id) {
  if (id == null || String(id).trim() === "") {
    throw new Error("A payment ID is required.");
  }
  const response = await apiRequest(
    `/admin/payments/${encodeURIComponent(id)}/verify`,
    { method: "PATCH" },
  );
  if (
    response?.success !== true ||
    response.data?.id == null ||
    response.data.status !== "paid"
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm the payment as paid.",
    );
  }
  return response.data;
}

export async function rejectPayment(id, rejectionReason) {
  if (id == null || String(id).trim() === "") {
    throw new Error("A payment ID is required.");
  }
  if (typeof rejectionReason !== "string" || !rejectionReason.trim()) {
    throw new Error("A rejection reason is required.");
  }
  const response = await apiRequest(
    `/admin/payments/${encodeURIComponent(id)}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
    },
  );
  if (
    response?.success !== true ||
    response.data?.id == null ||
    response.data.status !== "rejected"
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm the payment as rejected.",
    );
  }
  return response.data;
}

export async function createPaymentMethod({
  paymentMethodName,
  accountName,
  accountNumber,
}) {
  const response = await apiRequest("/admin/payment-methods", {
    method: "POST",
    body: JSON.stringify({
      paymentMethodName,
      accountName,
      accountNumber,
    }),
  });

  if (
    response?.success !== true ||
    !response.data ||
    response.data.id == null
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm payment method creation.",
    );
  }

  return response.data;
}

export async function updatePaymentMethodStatus(id, isActive) {
  const response = await apiRequest(
    `/admin/payment-methods/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    },
  );

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm the payment method status update.",
    );
  }

  return response;
}
