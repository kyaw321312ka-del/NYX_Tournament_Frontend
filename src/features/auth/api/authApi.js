import { apiRequest } from "../../../core/api/apiClient";

export async function registerAccount({
  registrationData,
  categoryIds,
  password,
  frontIdImg,
  backIdImg,
  profileImage,
}) {
  const formData = new FormData();
  formData.append("name", registrationData.fullName);
  formData.append("email", registrationData.email);
  formData.append("phno", String(registrationData.phone || "").trim());
  formData.append("password", password);
  formData.append("gender", registrationData.gender);
  formData.append("birthday", registrationData.birthday);
  formData.append("address", registrationData.address);
  formData.append("clubName", registrationData.club);
  categoryIds.forEach((categoryId) =>
    formData.append("categoryIds", String(categoryId)),
  );
  formData.append("frontIdImg", frontIdImg, frontIdImg.name);
  formData.append("backIdImg", backIdImg, backIdImg.name);
  if (profileImage) {
    formData.append("profileImage", profileImage, profileImage.name);
  }

  const response = await apiRequest("/auth/register", {
    method: "POST",
    authenticated: false,
    body: formData,
  });

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm account registration.",
    );
  }

  return response;
}

export async function verifyEmail({ email, otp }) {
  const response = await apiRequest("/auth/verify-email", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify({ email, otp }),
  });

  if (
    response?.success !== true ||
    typeof response.data?.token !== "string" ||
    !response.data.user ||
    typeof response.data.user.role !== "string"
  ) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The email verification response did not contain a valid session.",
    );
  }

  return {
    token: response.data.token,
    user: response.data.user,
  };
}

export async function login(credentials) {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    authenticated: false,
    body: JSON.stringify(credentials),
  });

  if (
    response?.success !== true ||
    typeof response.data?.token !== "string" ||
    !response.data.user ||
    typeof response.data.user.role !== "string"
  ) {
    const message =
      (typeof response?.message === "string" && response.message) ||
      "The login response did not contain a valid session.";
    throw new Error(message);
  }

  return {
    token: response.data.token,
    user: response.data.user,
  };
}

export async function logout() {
  const response = await apiRequest("/auth/logout", {
    method: "POST",
  });

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm logout.",
    );
  }

  return response;
}

export async function getCurrentUser() {
  const response = await apiRequest("/auth/me");
  if (
    response?.success !== true ||
    !response.data?.user ||
    typeof response.data.user.role !== "string"
  ) {
    const message =
      (typeof response?.message === "string" && response.message) ||
      "The profile response did not contain valid user data.";
    throw new Error(message);
  }

  return response.data.user;
}

export async function updateCurrentUser(updates, files = {}) {
  const hasFiles = Boolean(
    files.profileImage || files.frontIdImg || files.backIdImg,
  );
  let body;

  if (hasFiles) {
    body = new FormData();
    Object.entries(updates).forEach(([field, value]) => {
      body.append(
        field,
        field === "categoryIds"
          ? JSON.stringify(value)
          : value == null
            ? ""
            : String(value),
      );
    });
    ["profileImage", "frontIdImg", "backIdImg"].forEach((field) => {
      const file = files[field];
      if (file) body.append(field, file, file.name);
    });
  } else {
    body = JSON.stringify(updates);
  }

  const response = await apiRequest("/users/me", {
    method: "PATCH",
    body,
  });

  if (response?.success !== true) {
    throw new Error(
      (typeof response?.message === "string" && response.message) ||
        "The server did not confirm profile updates.",
    );
  }

  return response.data?.user || response.data || null;
}
