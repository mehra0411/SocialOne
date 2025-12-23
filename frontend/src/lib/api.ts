import { supabase } from './supabaseClient';

type ApiError = {
  error?: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!rawBase) {
    throw new Error('VITE_API_BASE_URL is not set');
  }
  const base = rawBase.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  // Merge headers (init wins)
  const mergedHeaders = {
    ...headers,
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };

  const resp = await fetch(url, { ...init, headers: mergedHeaders });
  const text = await resp.text();
  let maybeJson: unknown = null;
  if (text) {
    try {
      maybeJson = JSON.parse(text) as unknown;
    } catch {
      // Common dev failure mode: HTML from Vite dev server/proxy misconfig.
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('API returned HTML instead of JSON (check VITE_API_BASE_URL / dev proxy).');
      }
      throw new Error('API returned invalid JSON.');
    }
  }

  if (!resp.ok) {
    const msg =
      (maybeJson as ApiError | null)?.error ||
      `Request failed: ${resp.status}`;
    throw new Error(msg);
  }

  return maybeJson as T;
}


