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

  const brandLabel = activeBrandName ?? `Brand ${activeBrandId.slice(0, 8)}…`;

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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Platforms</h1>
        <p className="text-sm text-zinc-600">Connect platforms to enable publishing. No content is created here.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-900">Active brand</div>
            <div className="text-sm text-zinc-600">{brandLabel}</div>
            <div className="font-mono text-xs text-zinc-500">{activeBrandId}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} to="/brands">
              Switch brand
            </Link>
            <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} to="/brand/profile">
              Brand profile
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900">Instagram</h2>
            <p className="text-sm text-zinc-600">
              Connect Instagram for this brand to enable publishing. We don’t fetch media or manage your content here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={[
                'rounded-full px-2 py-1 text-xs font-medium',
                derivedState.state === 'connected'
                  ? 'bg-green-50 text-green-800'
                  : derivedState.state === 'expired'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-zinc-100 text-zinc-700',
              ].join(' ')}
            >
              {statusLoading ? 'Checking…' : derivedState.state === 'connected' ? 'Connected' : derivedState.state === 'expired' ? 'Expired' : 'Not connected'}
            </span>
          </div>
        </div>

        {oauthSuccessHint ? (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-900">
            Connection completed. Verifying status…
          </div>
        ) : null}

        {statusError ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {statusError}{' '}
            <button className="ml-2 underline" onClick={() => void refreshStatus()} disabled={statusLoading}>
              Retry
            </button>
          </div>
        ) : null}

        {derivedState.state !== 'connected' ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
              You’ll be redirected to Meta to approve access, then returned here.
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <button
              className={buttonClassName({ variant: 'primary' })}
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
              {connecting ? 'Redirecting…' : derivedState.state === 'expired' ? 'Reconnect Instagram' : 'Connect Instagram'}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-900">
            <div className="font-medium">Instagram connected</div>
            <div className="mt-1 text-green-800">
              You can now publish content for this brand (where supported).
              <div className="mt-2 grid gap-1 text-sm text-green-900">
                <div>
                  <span className="font-medium">Account:</span> {derivedState.accountName ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Expires:</span> {derivedState.expiresAt ?? '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


