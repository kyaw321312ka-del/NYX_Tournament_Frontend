import { useCallback, useEffect, useMemo, useState } from "react";
import AuthContext from "./AuthContext";
import { login as loginRequest, logout as logoutRequest } from "./api/authApi";
import {
  clearSession,
  readSession,
  saveSession,
  SESSION_EXPIRED_EVENT,
} from "./session";

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

  const value = useMemo(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
