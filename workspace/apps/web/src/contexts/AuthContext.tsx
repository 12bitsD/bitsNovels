import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { client, setAuthTokenGetter } from '../api/client';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isAuthenticated = !!token && !!user;

  // Sync token to API client's getter
  useEffect(() => {
    if (token !== null) {
      setAuthTokenGetter(() => token);
    }
  }, [token]);

  // Fetch user profile on mount if token exists
  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      try {
        const { data } = await client.GET('/api/auth/me');
        if (data) {
          const d = data as { user: User; is_verified?: boolean };
          setUser(d.user);
          setIsVerified(d.is_verified ?? false);
        }
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await client.POST('/api/auth/login', {
        body: { email, password, remember_me: rememberMe }
      });
      if (error) throw new Error((error as { detail?: string }).detail || '登录失败');
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be used within <AuthProvider>');
  }
  return context;
};
