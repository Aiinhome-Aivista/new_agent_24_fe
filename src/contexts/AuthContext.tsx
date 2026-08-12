import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/services/api/authApi";
import { setAccessToken } from "@/services/api/apiClient";
import type { User } from "@/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);
const REFRESH_KEY = "tdd-refresh";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) { setLoading(false); return; }
    authApi.refresh(refresh)
      .then(async ({ access_token }) => {
        setAccessToken(access_token);
        setUser(await authApi.me());
      })
      .catch(() => localStorage.removeItem(REFRESH_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAccessToken(res.access_token);
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    setUser(res.user);
  };

  const logout = () => {
    authApi.logout().catch(() => undefined);
    setAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  };

  const hasPermission = (perm: string) =>
    !!user && (user.permissions.includes(perm) || user.permissions.includes("admin.manage"));

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
