type ApiError = {
  error?: string;
};

export function getJwt(): string | null {
  return localStorage.getItem('socialone.jwt');
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const jwt = getJwt();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  // Merge headers (init wins)
  const mergedHeaders = {
    ...headers,
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };

  const resp = await fetch(url, { ...init, headers: mergedHeaders });
  const text = await resp.text();

  const maybeJson = text ? (JSON.parse(text) as unknown) : null;

  if (!resp.ok) {
    const msg =
      (maybeJson as ApiError | null)?.error ||
      `Request failed: ${resp.status}`;
    throw new Error(msg);
  }

  return maybeJson as T;
}


