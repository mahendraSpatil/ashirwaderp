import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api, getToken, setToken, clearToken } from '@/services/api';
import type { AuthUser } from '@/services/api';
import type { Role } from '@/types';

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  title: string;
  avatarInitials: string;
  email: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: Role
  ) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAppUser(u: AuthUser): AppUser {
  return {
    id: u.id,
    name: u.name,
    role: (String(u.role || '')).toLowerCase() as Role,
    title: u.title,
    avatarInitials: u.avatarInitials,
    email: u.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then(({ user: u }) => setUser(toAppUser(u)))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { token, user: u } = await api.signIn(email, password);
      setToken(token);
      setUser(toAppUser(u));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: Role) => {
      try {
        const { token, user: u } = await api.signUp(email, password, fullName, role);
        setToken(token);
        setUser(toAppUser(u));
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Sign up failed' };
      }
    },
    []
  );

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
