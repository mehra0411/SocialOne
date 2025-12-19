import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type UserRole = 'user' | 'super_admin';

export type AuthUser = {
  id: string;
  email: string | null;
  role: UserRole;
  accessToken: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const JWT_STORAGE_KEY = 'socialone.jwt';

function getRoleFromSession(session: Session): UserRole {
  const role = (session.user?.app_metadata as { role?: unknown } | undefined)?.role;
  return role === 'super_admin' ? 'super_admin' : 'user';
}

function sessionToAuthUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: getRoleFromSession(session),
    accessToken: session.access_token,
  };
}

function saveJwt(jwt: string | null) {
  if (!jwt) {
    localStorage.removeItem(JWT_STORAGE_KEY);
    return;
  }
  localStorage.setItem(JWT_STORAGE_KEY, jwt);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      if (session) {
        const u = sessionToAuthUser(session);
        setUser(u);
        saveJwt(u.accessToken);
      } else {
        setUser(null);
        saveJwt(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session ? sessionToAuthUser(session) : null;
      setUser(next);
      saveJwt(next?.accessToken ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


