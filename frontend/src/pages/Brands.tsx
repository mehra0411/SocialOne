import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { buttonClassName } from '../ui/button';
import { useActiveBrand } from '../brands/activeBrand';

type Brand = {
  id: string;
  name: string | null;
};

function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('unauthorized')) return 'Your session has expired. Please log in again.';
  if (lower.includes('forbidden')) return 'You don’t have access to brands for this account.';
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network issue—please check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function BrandsPage() {
  const navigate = useNavigate();
  const { setActiveBrand, activeBrandId } = useActiveBrand();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const list = await apiFetch<Brand[]>('/api/brands');
      setBrands(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAny = brands.length > 0;

  const activeName = useMemo(() => {
    if (!activeBrandId) return null;
    return brands.find((b) => b.id === activeBrandId)?.name ?? null;
  }, [activeBrandId, brands]);

  useEffect(() => {
    // Best-effort: if we have an active id but not a name yet, fill it once brands load.
    if (!activeBrandId) return;
    if (!activeName) return;
    setActiveBrand({ id: activeBrandId, name: activeName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrandId, activeName]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Create a Brand</h1>
        <p className="text-sm text-zinc-600">A brand is your content workspace</p>
        <p className="text-sm text-zinc-600">You’ll connect social platforms and create content after this step.</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900">Create a Brand</h2>
            <p className="text-sm text-zinc-600">A brand is your content workspace</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:max-w-md">
          <label className="text-sm font-medium text-zinc-900">Brand Name</label>
          <input
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
            placeholder="e.g. Acme Fitness"
            value={name}
            onChange={(e) => {
              setCreateError(null);
              setName(e.target.value);
            }}
          />

          {createError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{createError}</div> : null}

          <div className="flex items-center gap-2">
            <button
              className={buttonClassName({ variant: 'primary' })}
              disabled={creating || !name.trim()}
              onClick={async () => {
                setCreateError(null);
                const trimmed = name.trim();
                if (!trimmed) {
                  setCreateError('Brand name is required.');
                  return;
                }

                setCreating(true);
                try {
                  const created = await apiFetch<Brand>('/api/brands', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: trimmed }),
                  });

                  const createdName = created.name ?? trimmed;
                  setActiveBrand({ id: created.id, name: createdName });
                  setBrands((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
                  setName('');
                  navigate('/dashboard');
                } catch (e) {
                  setCreateError(friendlyErrorMessage(e));
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Creating…' : 'Create Brand'}
            </button>

            <button
              className={buttonClassName({ variant: 'secondary' })}
              disabled={loading}
              onClick={() => void refresh()}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900">Your brands</h2>
            <p className="text-sm text-zinc-600">Select a brand to make it active.</p>
          </div>
          <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${brands.length} brands`}</div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}{' '}
            <button className="ml-2 underline" onClick={() => void refresh()} disabled={loading}>
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !hasAny ? (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
            <div className="font-medium text-zinc-900">No brands yet</div>
            <div className="text-zinc-600">Create your first brand above to start generating and scheduling posts.</div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          {brands.map((b) => {
            const displayName = b.name ?? 'Untitled brand';
            const isActive = activeBrandId === b.id;
            return (
              <button
                key={b.id}
                className={[
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                  isActive ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-zinc-200 bg-white hover:bg-zinc-50',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2',
                ].join(' ')}
                onClick={() => {
                  setActiveBrand({ id: b.id, name: displayName });
                  navigate('/dashboard');
                }}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-zinc-900">{displayName}</div>
                  <div className="mt-0.5 font-mono text-xs text-zinc-500">{b.id}</div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#4F46E5]">Active</span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                      Select
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}


