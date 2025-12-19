import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

type BrandOption = { id: string; name: string };
type FeedPost = {
  id: string;
  brand_id: string;
  caption: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'failed';
  created_at: string;
};

const BRANDS_KEY = 'socialone.brands';

function loadBrands(): BrandOption[] {
  try {
    const raw = localStorage.getItem(BRANDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => x as Partial<BrandOption>)
      .filter((b) => typeof b.id === 'string' && typeof b.name === 'string') as BrandOption[];
  } catch {
    return [];
  }
}

function saveBrands(brands: BrandOption[]) {
  localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
}

export function DashboardPage() {
  const [brands, setBrands] = useState<BrandOption[]>(() => loadBrands());
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => loadBrands()[0]?.id ?? '');

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandId, setNewBrandId] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');

  const [draft, setDraft] = useState<FeedPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => saveBrands(brands), [brands]);

  useEffect(() => {
    // Keep selection valid if list changes.
    if (selectedBrandId && brands.some((b) => b.id === selectedBrandId)) return;
    setSelectedBrandId(brands[0]?.id ?? '');
  }, [brands, selectedBrandId]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-600">Feed draft generation and publishing (no admin required).</p>
      </div>

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900">Feed</h2>
            <p className="text-sm text-zinc-600">Select a brand, generate a caption draft, then publish.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-900">Brand</label>
                <span className="text-xs text-zinc-500">Local selector (until brands API exists)</span>
              </div>

              <select
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
              >
                <option value="" disabled>
                  Select a brand…
                </option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </div>

            <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-900">Add brand to selector</summary>
              <div className="mt-3 grid gap-2">
                <input
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="Brand name (e.g. Acme)"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                />
                <input
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="Brand id (uuid)"
                  value={newBrandId}
                  onChange={(e) => setNewBrandId(e.target.value)}
                />
                <button
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  disabled={!newBrandName.trim() || !newBrandId.trim()}
                  onClick={() => {
                    const next: BrandOption = { name: newBrandName.trim(), id: newBrandId.trim() };
                    setBrands((prev) => [next, ...prev.filter((b) => b.id !== next.id)]);
                    setNewBrandName('');
                    setNewBrandId('');
                    setSelectedBrandId(next.id);
                  }}
                >
                  Add brand
                </button>
              </div>
            </details>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Image URL (optional)</label>
              <input
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Used for preview and publishing. Must be public for Instagram publishing.
              </p>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Prompt (optional)</label>
              <textarea
                className="min-h-24 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Any context for the caption (offer, tone, etc)…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={!selectedBrandId || generating}
                onClick={async () => {
                  setError(null);
                  setDraft(null);
                  setGenerating(true);
                  try {
                    const resp = await apiFetch<{ feedPost: FeedPost }>('/api/feed/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        brandId: selectedBrandId,
                        imageUrl: imageUrl.trim() || undefined,
                        prompt: prompt.trim() || undefined,
                      }),
                    });
                    setDraft(resp.feedPost);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to generate');
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                {generating ? 'Generating…' : 'Generate caption (draft)'}
              </button>

              <button
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                disabled={!draft || draft.status !== 'draft' || publishing}
                onClick={async () => {
                  if (!draft) return;
                  setError(null);
                  setPublishing(true);
                  try {
                    await apiFetch('/api/feed/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandId: selectedBrandId, feedPostId: draft.id }),
                    });
                    setDraft((prev) => (prev ? { ...prev, status: 'published' } : prev));
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to publish');
                    setDraft((prev) => (prev ? { ...prev, status: 'failed' } : prev));
                  } finally {
                    setPublishing(false);
                  }
                }}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">Draft preview</h3>
                <span className="text-xs text-zinc-500">
                  {draft ? `status: ${draft.status}` : 'no draft yet'}
                </span>
              </div>

              {draft ? (
                <div className="mt-3 grid gap-3">
                  <div className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">Brand:</span>{' '}
                    {selectedBrand?.name ?? 'Unknown'} ({draft.brand_id})
                  </div>

                  {draft.image_url || imageUrl ? (
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      <img
                        src={draft.image_url ?? imageUrl}
                        alt="Draft"
                        className="h-56 w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="px-3 py-2 text-xs text-zinc-600">Image preview</div>
                    </div>
                  ) : null}

                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-900 whitespace-pre-wrap">
                    {draft.caption || '(empty caption)'}
                  </div>

                  <div className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">feedPostId:</span> {draft.id}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                  Generate a draft to preview the caption here.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


