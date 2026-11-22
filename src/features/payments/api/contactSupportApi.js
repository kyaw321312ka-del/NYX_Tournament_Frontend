import { apiRequest } from "../../../core/api/apiClient";

const CONTACT_SUPPORT_ENDPOINT = "/admin/contact-support";
const PUBLIC_CONTACT_SUPPORT_ENDPOINT = "/contact-support";

function getErrorMessage(response, fallback) {
  return (
    (typeof response?.message === "string" && response.message) ||
    fallback
  );
}

function normalizeContactSupport(contactSupport) {
  const normalized = {
    phone: String(contactSupport.phone || "").trim(),
    website: String(contactSupport.website || "").trim(),
    email: String(contactSupport.email || "").trim(),
    address: String(contactSupport.address || "").trim(),
  };

  if (Object.values(normalized).some((value) => !value)) {
    throw new Error("Complete the phone, website, email, and address fields.");
  }

  return normalized;
}

export async function getContactSupport() {
  const response = await apiRequest(PUBLIC_CONTACT_SUPPORT_ENDPOINT, {
    authenticated: false,
  });
  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(response, "Unable to load contact support information."),
    );
  }

  if (response.data == null) return null;

  const { phone, website, email, address } = response.data;
  if (
    typeof phone !== "string" ||
    typeof website !== "string" ||
    typeof email !== "string" ||
    typeof address !== "string"
  ) {
    throw new Error(
      "The server returned invalid contact support information.",
    );
  }

  return { phone, website, email, address };
}

async function saveContactSupport(method, contactSupport, fallback) {
  const response = await apiRequest(CONTACT_SUPPORT_ENDPOINT, {
    method,
    body: JSON.stringify(normalizeContactSupport(contactSupport)),
  });

  if (response?.success !== true) {
    throw new Error(getErrorMessage(response, fallback));
  }

  return response.data;
}

export function createContactSupport(contactSupport) {
  return saveContactSupport(
    "POST",
    contactSupport,
    "The server did not confirm contact support creation.",
  );
}

export function updateContactSupport(contactSupport) {
  return saveContactSupport(
    "PUT",
    contactSupport,
    "The server did not confirm the contact support update.",
  );
}

export async function deleteContactSupport() {
  const response = await apiRequest(CONTACT_SUPPORT_ENDPOINT, {
    method: "DELETE",
  });

  if (response?.success !== true) {
    throw new Error(
      getErrorMessage(response, "The server did not confirm contact support deletion."),
    );
  }

  return response;
}
