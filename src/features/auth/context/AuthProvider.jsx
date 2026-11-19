import { useCallback, useEffect, useMemo, useState } from "react";
import AuthContext from "./AuthContext";
import {
  getCurrentUser as getCurrentUserRequest,
  login as loginRequest,
  logout as logoutRequest,
} from "../api/authApi";
import {
  clearSession,
  readSession,
  saveSession,
  SESSION_EXPIRED_EVENT,
} from "../utils/session";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    const handleSessionExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const signIn = useCallback(async (credentials) => {
    const nextSession = await loginRequest(credentials);
    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
      setSession(null);
    }
  }, []);

  const accessToken = session?.token;
  const refreshUser = useCallback(async () => {
    if (!accessToken) {
      throw new Error("Sign in to load your profile.");
    }

    const user = await getCurrentUserRequest();
    const nextSession = { token: accessToken, user };
    saveSession(nextSession);
    setSession(nextSession);
    return user;
  }, [accessToken]);

  const value = useMemo(
    () => ({ session, signIn, signOut, refreshUser }),
    [session, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
