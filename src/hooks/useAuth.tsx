import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import * as api from '../api/endpoints';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (email: string, code: string) => Promise<void>;
  sendLoginOtp: (email: string) => Promise<void>;
  acceptInvite: (email: string, code: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    api
      .getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const u = await api.login(email, password);
      setUser(u);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const loginWithOtp = useCallback(async (email: string, code: string) => {
    setError(null);
    try {
      const u = await api.loginWithOtp(email, code);
      setUser(u);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'OTP login failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const sendLoginOtp = useCallback(async (email: string) => {
    setError(null);
    try {
      await api.sendLoginOtp(email);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send OTP';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const acceptInvite = useCallback(
    async (email: string, code: string, name: string, password: string) => {
      setError(null);
      try {
        const u = await api.acceptInvite(email, code, name, password);
        setUser(u);
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Failed to accept invite';
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, login, loginWithOtp, sendLoginOtp, acceptInvite, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Permission helper hook ──────────────────────────────────────────
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_super_admin) return true;
  return user.permissions[permission] === true;
}

export function usePermissions(...permissions: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_super_admin) return true;
  return permissions.every((p) => user.permissions[p] === true);
}

export function useAnyPermission(...permissions: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.is_super_admin) return true;
  return permissions.some((p) => user.permissions[p] === true);
}
