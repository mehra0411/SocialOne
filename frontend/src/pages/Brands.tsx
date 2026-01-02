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
    <div className="space-y-6 font-sans from-gray-50 to-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">Create a Brand</h1>
              <p className="text-md text-primary font-medium">A brand is your content workspace. You'll connect social platforms and create content after this step.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Brand Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Create New Brand</h2>
              <p className="text-sm text-gray-500">Start by creating your first brand workspace</p>
            </div>
          </div>

          <div className="grid gap-4 sm:max-w-md">
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-gray-900">Brand Name</label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                placeholder="e.g. Acme Fitness"
                value={name}
                onChange={(e) => {
                  setCreateError(null);
                  setName(e.target.value);
                }}
              />
            </div>

            {createError ? (
              <div className="rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">
                {createError}
              </div>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                className={buttonClassName({ variant: 'primary' }) + ' shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
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
                className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'}
                disabled={loading}
                onClick={() => void refresh()}
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Your Brands Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Your Brands</h2>
                <p className="text-sm text-gray-500">Select a brand to make it active</p>
              </div>
            </div>
            <div className="text-xs text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl px-3 py-1.5 shadow-md font-semibold">
              {loading ? 'Loading…' : `${brands.length} ${brands.length === 1 ? 'brand' : 'brands'}`}
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button className="ml-2 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors" onClick={() => void refresh()} disabled={loading}>
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {!loading && !hasAny ? (
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 border-2 border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md flex-shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-semibold text-indigo-900">No brands yet</div>
                  <div className="text-sm text-indigo-800">Create your first brand above to start generating and scheduling posts.</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {brands.map((b) => {
              const displayName = b.name ?? 'Untitled brand';
              const isActive = activeBrandId === b.id;
              return (
                <button
                  key={b.id}
                  className={[
                    'group/brand relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 w-full',
                    isActive
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl scale-[1.01]'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:shadow-md',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                  ].join(' ')}
                  onClick={() => {
                    setActiveBrand({ id: b.id, name: displayName });
                    navigate('/dashboard');
                  }}
                >
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-sm">{displayName}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isActive ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 group-hover/brand:bg-indigo-100 group-hover/brand:text-indigo-700 transition-colors">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}


