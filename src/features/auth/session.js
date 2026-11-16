const SESSION_STORAGE_KEY = "nyx.auth.session";
export const SESSION_EXPIRED_EVENT = "nyx:session-expired";

export function readSession() {
  const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession);
    if (
      typeof session?.token === "string" &&
      session.user &&
      typeof session.user === "object" &&
      typeof session.user.role === "string"
    ) {
      return session;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }

  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem("nyx_auth");
}

export function getAccessToken() {
  return readSession()?.token ?? null;
}
