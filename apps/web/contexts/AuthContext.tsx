"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@rm/types";
import {
  clearAuthStorage,
  getStoredAccessToken,
  getStoredUser,
  storeAuthSession,
  subscribeAuthChanges,
} from "../lib/auth-storage";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(getStoredAccessToken());
    setUser(getStoredUser());
    setIsLoading(false);

    return subscribeAuthChanges(() => {
      setToken(getStoredAccessToken());
      setUser(getStoredUser());
    });
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser, refreshToken: string) => {
    setToken(newToken);
    setUser(newUser);
    storeAuthSession({ accessToken: newToken, refreshToken, user: newUser });
  }, []);

  const hasRole = useCallback((role: string) => user?.roles.includes(role) ?? false, [user]);
  const hasAnyRole = useCallback((roles: string[]) => roles.some((r) => user?.roles.includes(r)) ?? false, [user]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAuthStorage();
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user, isLoading, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
