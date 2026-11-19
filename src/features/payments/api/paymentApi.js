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
