import { useState, useEffect, type ReactNode } from 'react';
import { client, setAuthTokenGetter } from '../api/client';
import { AuthContext } from './AuthContextValue';
import type { User } from '@bitsnovels/api-types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const { data, error } = await client.GET('/api/auth/me');
        if (error || !data) {
          throw new Error('Authentication required');
        }

        const d = data as {
          user: User;
          isVerified?: boolean;
          is_verified?: boolean;
        };
        setUser(d.user);
        setIsVerified(d.isVerified ?? d.is_verified ?? false);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsVerified(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await client.POST('/api/auth/login', {
        body: { email, password, rememberMe }
      });
      const detail =
        (error as { detail?: string; error?: { message?: string } } | undefined)?.detail
        ?? (error as { error?: { message?: string } } | undefined)?.error?.message;
      if (error) throw new Error(detail || '登录失败');
      const d = data as { token?: string };
      if (d?.token) {
        localStorage.setItem('token', d.token);
        setToken(d.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsVerified(false);
  };

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated, isLoading, isVerified, login, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}
