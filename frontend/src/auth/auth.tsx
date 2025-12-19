import React, { createContext, useContext, useMemo, useState } from 'react';

export type UserRole = 'user' | 'super_admin';

export type AuthUser = {
  id: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'socialone.auth';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed?.id) return null;
    if (parsed.role !== 'user' && parsed.role !== 'super_admin') return null;
    return { id: parsed.id, role: parsed.role };
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loginAs: (role) => {
        const next = { id: crypto.randomUUID(), role };
        setUser(next);
        saveUser(next);
      },
      logout: () => {
        setUser(null);
        saveUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


