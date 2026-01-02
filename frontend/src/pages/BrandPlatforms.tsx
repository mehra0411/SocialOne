import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useActiveBrand } from '../brands/activeBrand';
import { apiFetch } from '../lib/api';
import { buttonClassName } from '../ui/button';

type OAuthStartResponse = {
  redirectUrl: string;
};

type PlatformStatusResponse = {
  platform: 'instagram';
  connected: boolean;
  accountName: string | null;
  expiresAt: string | null;
};

function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('unauthorized')) return 'Your session has expired. Please log in again.';
  if (lower.includes('forbidden')) return 'You don’t have access to connect platforms for this brand.';
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network issue—please check your connection and try again.';
  }
  return msg || 'Something went wrong. Please try again.';
}

export function BrandPlatformsPage() {
  const { activeBrandId, activeBrandName } = useActiveBrand();
  const navigate = useNavigate();
  const location = useLocation();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlatformStatusResponse | null>(null);
  const [oauthSuccessHint, setOauthSuccessHint] = useState(false);

  if (!activeBrandId) return <Navigate to="/brands" replace />;

  const brandLabel = activeBrandName ?? 'Untitled brand';

  const derivedState = useMemo(() => {
    if (!status) return { state: 'unknown' as const, connected: false, accountName: null, expiresAt: null };
    if (status.connected) return { state: 'connected' as const, connected: true, accountName: status.accountName, expiresAt: status.expiresAt };
    // Distinguish expired vs never-connected without changing response shape:
    // - expired: a record exists but connected=false (we return accountName if we have an identifier)
    // - not_connected: no record (accountName null)
    if (status.accountName) return { state: 'expired' as const, connected: false, accountName: status.accountName, expiresAt: status.expiresAt };
    return { state: 'not_connected' as const, connected: false, accountName: null, expiresAt: null };
  }, [status]);

  async function refreshStatus() {
    setStatusError(null);
    setStatusLoading(true);
    try {
      const resp = await apiFetch<PlatformStatusResponse>(`/api/brands/${activeBrandId}/platforms`);
      setStatus(resp);
    } catch (e) {
      setStatusError(friendlyErrorMessage(e));
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    if (success === '1') {
      setOauthSuccessHint(true);
      setError(null);
      // Clean the URL so refreshes don't keep showing the success "event".
      params.delete('success');
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrandId]);

  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrandId]);

  return (
    <div className="space-y-6 font-sans from-gray-50 to-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">Platforms</h1>
              <p className="text-md text-primary font-medium">Connect platforms to enable publishing. No content is created here.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Brand Card */}
      <div className="transform transition-all duration-300 hover:scale-[1.01]">
        <div className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl shadow-xl ring-1 ring-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active Brand</div>
                  <div className="text-lg font-bold text-gray-900 sm:text-xl">{brandLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-md hover:shadow-lg transition-shadow'} to="/brands">
                  Switch brand
                </Link>
                <Link className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-md hover:shadow-lg transition-shadow'} to="/brand/profile">
                  Brand profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instagram Platform Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Instagram</h2>
                <p className="text-sm text-gray-500">Connect Instagram for this brand to enable publishing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold shadow-md',
                  derivedState.state === 'connected'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : derivedState.state === 'expired'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
                ].join(' ')}
              >
                {statusLoading ? 'Checking…' : derivedState.state === 'connected' ? 'Connected' : derivedState.state === 'expired' ? 'Expired' : 'Not connected'}
              </span>
            </div>
          </div>

          {oauthSuccessHint ? (
            <div className="mt-6 animate-in slide-in-from-top-2 rounded-2xl bg-gradient-to-r from-green-500/90 to-emerald-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Connection completed. Verifying status…
              </div>
            </div>
          ) : null}

          {statusError ? (
            <div className="mt-6 animate-in slide-in-from-top-2 rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span>{statusError}</span>
                <button className="ml-2 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors" onClick={() => void refreshStatus()} disabled={statusLoading}>
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {derivedState.state !== 'connected' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-gradient-to-r from-violet-100 to-purple-100 p-4 text-sm text-violet-900 border border-violet-200">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-semibold mb-1">Connection Process</div>
                    <div className="text-violet-800">You'll be redirected to Meta to approve access, then returned here.</div>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
                  {error}
                </div>
              ) : null}

              <button
                className={buttonClassName({ variant: 'primary' }) + ' w-full sm:w-auto shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'}
                disabled={connecting}
                onClick={async () => {
                  setError(null);
                  setConnecting(true);
                  try {
                    const resp = await apiFetch<OAuthStartResponse>('/api/instagram/oauth/start', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandId: activeBrandId }),
                    });
                    if (!resp?.redirectUrl) throw new Error('Missing redirectUrl');
                    window.location.assign(resp.redirectUrl);
                  } catch (e) {
                    setError(friendlyErrorMessage(e));
                    setConnecting(false);
                  }
                }}
              >
                {connecting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    {derivedState.state === 'expired' ? 'Reconnect Instagram' : 'Connect Instagram'}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-2 border-green-200 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md flex-shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-lg font-bold text-green-900">Instagram Connected</div>
                    <div className="mt-1 text-sm text-green-800">You can now publish content for this brand (where supported).</div>
                  </div>
                  <div className="grid gap-2 rounded-xl bg-white/60 p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-green-900">Account:</span>
                      <span className="text-sm font-medium text-green-800">{derivedState.accountName ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-green-900">Expires:</span>
                      <span className="text-sm font-medium text-green-800">{derivedState.expiresAt ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


