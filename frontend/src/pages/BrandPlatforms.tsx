import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useActiveBrand } from '../brands/activeBrand';
import { apiFetch } from '../lib/api';
import { buttonClassName } from '../ui/button';

type OAuthStartResponse = {
  redirectUrl: string;
};

const IG_CONNECTED_PREFIX = 'socialone.platform.instagram.connected.';

function getConnectedKey(brandId: string): string {
  return `${IG_CONNECTED_PREFIX}${brandId}`;
}

function isInstagramConnectedOptimistic(brandId: string): boolean {
  return localStorage.getItem(getConnectedKey(brandId)) === '1';
}

function setInstagramConnectedOptimistic(brandId: string) {
  localStorage.setItem(getConnectedKey(brandId), '1');
}

function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('unauthorized')) return 'Your session has expired. Please log in again.';
  if (lower.includes('forbidden')) return 'You don’t have access to connect platforms for this brand.';
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network issue—please check your connection and try again.';
  }
  return 'Could not start Instagram connection. Please try again.';
}

export function BrandPlatformsPage() {
  const { activeBrandId, activeBrandName } = useActiveBrand();
  const navigate = useNavigate();
  const location = useLocation();

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  if (!activeBrandId) return <Navigate to="/brands" replace />;

  const brandLabel = activeBrandName ?? `Brand ${activeBrandId.slice(0, 8)}…`;

  const connected = useMemo(() => {
    if (justConnected) return true;
    return isInstagramConnectedOptimistic(activeBrandId);
  }, [activeBrandId, justConnected]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    if (success === '1') {
      setInstagramConnectedOptimistic(activeBrandId);
      setJustConnected(true);
      setError(null);
      // Clean the URL so refreshes don't keep showing the success "event".
      params.delete('success');
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    }
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
                connected ? 'bg-green-50 text-green-800' : 'bg-zinc-100 text-zinc-700',
              ].join(' ')}
            >
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>

        {!connected ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
              You’ll be redirected to Meta to approve access, then returned here.
              <div className="mt-1 text-xs text-zinc-500">
                Note: We currently show connection success optimistically. {/* TODO: replace with real status check once backend exposes a status endpoint. */}
              </div>
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
              {connecting ? 'Redirecting…' : 'Connect Instagram'}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-900">
            <div className="font-medium">Instagram connected</div>
            <div className="mt-1 text-green-800">
              You can now publish content for this brand (where supported).
              <div className="mt-1 text-xs text-green-900/80">
                {/* TODO: Replace optimistic state with a backend status check (no endpoint exists today). */}
                This status is currently optimistic until the backend exposes a connection status endpoint.
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


