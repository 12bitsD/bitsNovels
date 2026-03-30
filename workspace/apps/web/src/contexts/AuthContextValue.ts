import { createContext } from 'react';

interface AuthContextType {
  user: { id: string; email: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
