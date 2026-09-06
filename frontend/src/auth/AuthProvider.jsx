import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { authService } from "@/services/authService";
import { setPostLoginRedirect } from "@/utils/redirect";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = guest

  const refresh = useCallback(async () => {
    try {
      setUser(await authService.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Returning from Google OAuth: AuthCallback exchanges the session first, so skip /me here.
    if (window.location.hash?.includes("session_id=")) {
      setUser(null);
      return;
    }
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user: user || null,
      loading: user === undefined,
      isAuthenticated: !!user,
      setUser,
      refresh,
      login: async (email, password) => {
        const data = await authService.login(email, password);
        setUser(data);
        return data;
      },
      register: async (payload) => {
        const data = await authService.register(payload);
        setUser(data);
        return data;
      },
      logout: async () => {
        try {
          await authService.logout();
        } finally {
          setUser(null);
        }
      },
      loginWithGoogle: (redirectPath) => {
        setPostLoginRedirect(redirectPath);
        authService.startGoogleLogin();
      },
      updateProfile: async (payload) => {
        const data = await authService.updateProfile(payload);
        setUser(data);
        return data;
      },
    }),
    [user, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
