"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  authRequired,
  clearTokens,
  hasPermission,
  loginRequest,
  logoutRequest,
  meRequest,
  persistTokens,
  readStoredAccess,
  readStoredRefresh,
  refreshRequest,
  type PortalUser
} from "@/lib/portal-api";

type AuthContextValue = {
  user: PortalUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (codename: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const bootstrap = useCallback(async () => {
    const access = readStoredAccess();
    const refresh = readStoredRefresh();
    if (!access && !refresh) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      if (access) {
        const me = await meRequest(access);
        setUser(me);
        setLoading(false);
        return;
      }
    } catch {
      /* try refresh */
    }
    if (refresh) {
      try {
        const { access: next } = await refreshRequest(refresh);
        persistTokens(next, refresh);
        const me = await meRequest(next);
        setUser(me);
      } catch {
        clearTokens();
        setUser(null);
      }
    } else {
      clearTokens();
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!authRequired() || loading) return;
    if (pathname === "/login") return;
    if (!readStoredAccess() && !readStoredRefresh()) {
      router.replace("/login");
    }
  }, [loading, pathname, router]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginRequest(username, password);
      persistTokens(res.access, res.refresh);
      setUser(res.user);
      router.replace("/");
    },
    [router]
  );

  const logout = useCallback(async () => {
    const at = readStoredAccess();
    if (at) {
      try {
        await logoutRequest(at);
      } catch {
        /* still clear client */
      }
    }
    clearTokens();
    setUser(null);
    if (authRequired()) router.replace("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    const at = readStoredAccess();
    if (!at) return;
    try {
      setUser(await meRequest(at));
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (codename: string) => hasPermission(user?.permissions, codename),
    [user?.permissions]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      can
    }),
    [user, loading, login, logout, refreshUser, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
