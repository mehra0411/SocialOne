import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { uploadImageAndGetPublicUrl } from '../lib/storage';
import { buttonClassName } from '../ui/button';
import { useActiveBrand } from '../brands/activeBrand';
import { fetchInstagramPlatformStatus } from '../lib/platformStatus';

type BrandOption = { id: string; name: string };
type FeedPost = {
  id: string;
  brand_id: string;
  caption: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'failed' | 'scheduled' | 'publishing';
  instagram_post_id?: string | null;
  error_message?: string | null;
  created_at: string;
};

type Reel = {
  id: string;
  brand_id: string;
  input_image_url: string | null;
  video_url: string | null;
  generation_method: 'ai' | 'fallback';
  status: 'draft' | 'generating' | 'ready' | 'published' | 'failed';
  created_at: string;
};

type ApiBrand = { id: string; name: string | null };

export function DashboardPage() {
  const { activeBrandId, setActiveBrand } = useActiveBrand();

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');

  const [igLoading, setIgLoading] = useState(false);
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [igHint, setIgHint] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');

  const [draft, setDraft] = useState<FeedPost | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Reels UI state
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelUploadUrl, setReelUploadUrl] = useState<string>('');
  const [reelId, setReelId] = useState<string>('');
  const [reel, setReel] = useState<Reel | null>(null);
  const [reelUploading, setReelUploading] = useState(false);
  const [reelGenerating, setReelGenerating] = useState(false);
  const [reelPublishing, setReelPublishing] = useState(false);
  const [reelError, setReelError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setBrandsError(null);
    setBrandsLoading(true);
    (async () => {
      try {
        const rows = await apiFetch<ApiBrand[]>('/api/brands');
        const next: BrandOption[] = (Array.isArray(rows) ? rows : [])
          .filter((b) => typeof b?.id === 'string')
          .map((b) => ({ id: b.id, name: b.name ?? 'Untitled brand' }));
        if (!mounted) return;
        setBrands(next);
      } catch (e) {
        if (!mounted) return;
        setBrandsError(e instanceof Error ? e.message : 'Failed to load brands');
      } finally {
        if (!mounted) return;
        setBrandsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // Keep selection valid if list changes.
    if (activeBrandId && brands.some((b) => b.id === activeBrandId)) {
      setSelectedBrandId(activeBrandId);
      return;
    }
    if (selectedBrandId && brands.some((b) => b.id === selectedBrandId)) return;
    setSelectedBrandId(brands[0]?.id ?? '');
  }, [activeBrandId, brands, selectedBrandId]);

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  );

  const hasBrands = brands.length > 0;

  useEffect(() => {
    if (!selectedBrandId) {
      setIgConnected(null);
      setIgHint(null);
      return;
    }

    let mounted = true;
    setIgHint(null);
    setIgLoading(true);
    (async () => {
      try {
        const status = await fetchInstagramPlatformStatus(selectedBrandId);
        if (!mounted) return;
        setIgConnected(status.connected);
        if (!status.connected) {
          setIgHint('Connect Instagram to publish.');
        }
      } catch (e) {
        if (!mounted) return;
        setIgConnected(null);
        setIgHint('Unable to verify Instagram connection right now.');
      } finally {
        if (!mounted) return;
        setIgLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedBrandId]);

  // Status polling for reels
  useEffect(() => {
    if (!reelId || !selectedBrandId) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const resp = await apiFetch<{ success: true; data: { reel: Reel } }>(
          `/api/reels/${selectedBrandId}/${reelId}`,
          { method: 'GET' },
        );
        if (cancelled) return;
        setReel(resp.data.reel);
      } catch {
        // Keep polling even if transient errors occur.
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reelId, selectedBrandId]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Welcome to SocialOne</h1>
        <p className="text-sm text-zinc-600">Create on-brand content faster — with or without AI</p>
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
                {brandsLoading ? <span className="text-xs text-zinc-500">Loading…</span> : null}
              </div>

              <select
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={selectedBrandId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedBrandId(id);
                  const b = brands.find((x) => x.id === id);
                  if (b) setActiveBrand({ id: b.id, name: b.name });
                }}
              >
                <option value="" disabled>
                  Select a brand…
                </option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {brandsError ? (
                <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{brandsError}</div>
              ) : null}
              {!brandsLoading && brands.length === 0 ? (
                <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
                  <div className="font-medium text-zinc-900">No brands yet</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <Link to="/brands" className={buttonClassName({ variant: 'primary' })}>
                      Create Your First Brand
                    </Link>
                    <div className="text-xs text-zinc-600">
                      Brands help us understand your voice and audience before creating content.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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

            {igHint ? (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
                {igHint}{' '}
                <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
                  Connect Instagram
                </Link>
                .
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className={buttonClassName({ variant: 'primary' })}
                disabled={!selectedBrandId || generating}
                onClick={async () => {
                  setError(null);
                  setPublishSuccess(null);
                  setDraft(null);
                  setGenerating(true);
                  try {
                    const resp = await apiFetch<FeedPost>('/api/feed/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        brandId: selectedBrandId,
                        imageUrl: imageUrl.trim() || undefined,
                        prompt: prompt.trim() || undefined,
                      }),
                    });
                    setDraft(resp);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to generate');
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                {generating ? 'Generating…' : 'Generate Content'}
              </button>

              {hasBrands ? (
                <Link to="/drafts" className={buttonClassName({ variant: 'secondary' })}>
                  View Drafts
                </Link>
              ) : null}

              {hasBrands ? (
                <button
                  type="button"
                  className={buttonClassName({ variant: 'secondary' })}
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Insights (Coming Soon)
                </button>
              ) : null}

              <button
                className={buttonClassName({ variant: 'secondary' })}
                disabled={!draft || draft.status !== 'draft' || publishing || igLoading || igConnected !== true}
                onClick={async () => {
                  if (!draft) return;
                  setError(null);
                  setPublishSuccess(null);
                  setPublishing(true);
                  try {
                    const resp = await apiFetch<{
                      feedPost: FeedPost;
                      instagramMediaId: string;
                      mediaContainerId: string;
                    }>('/api/feed/publish', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandId: selectedBrandId, feedPostId: draft.id }),
                    });
                    setDraft(resp.feedPost);
                    setPublishSuccess(`Posted to Instagram (id: ${resp.instagramMediaId})`);
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

            {publishSuccess ? (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{publishSuccess}</div>
            ) : null}
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
                    {selectedBrand?.name ?? 'Unknown'}
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

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-zinc-900">Reels</h2>
          <p className="text-sm text-zinc-600">Upload an image, generate a reel, poll status, then publish.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Input image</label>
              <input
                className="block w-full text-sm"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setReelError(null);
                  const f = e.target.files?.[0] ?? null;
                  setReelFile(f);
                  setReelUploadUrl('');
                }}
              />
              <p className="text-xs text-zinc-500">
                This uploads to Supabase Storage and uses the public URL as `input_image_url`.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className={buttonClassName({ variant: 'secondary' })}
                disabled={!reelFile || reelUploading}
                onClick={async () => {
                  if (!reelFile) return;
                  setReelError(null);
                  setReelUploading(true);
                  try {
                    const url = await uploadImageAndGetPublicUrl(reelFile);
                    setReelUploadUrl(url);
                  } catch (e) {
                    setReelError(e instanceof Error ? e.message : 'Upload failed');
                  } finally {
                    setReelUploading(false);
                  }
                }}
              >
                {reelUploading ? 'Uploading…' : 'Upload image'}
              </button>

              <button
                className={buttonClassName({ variant: 'primary' })}
                disabled={!selectedBrandId || !reelUploadUrl || reelGenerating}
                onClick={async () => {
                  setReelError(null);
                  setReelGenerating(true);
                  setReel(null);
                  setReelId('');
                  try {
                    const resp = await apiFetch<{
                      success: true;
                      data: { reelId: string; status: string };
                    }>('/api/reels/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandId: selectedBrandId, inputImageUrl: reelUploadUrl }),
                    });
                    setReelId(resp.data.reelId);
                  } catch (e) {
                    setReelError(e instanceof Error ? e.message : 'Generate failed');
                  } finally {
                    setReelGenerating(false);
                  }
                }}
              >
                {reelGenerating ? 'Generating…' : 'Generate reel'}
              </button>
            </div>

            {reelError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{reelError}</div> : null}

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <div className="grid gap-1">
                <div>
                  <span className="font-medium">brandId:</span> {selectedBrandId || '(none)'}
                </div>
                <div>
                  <span className="font-medium">input_image_url:</span> {reelUploadUrl || '(upload first)'}
                </div>
                <div>
                  <span className="font-medium">reelId:</span> {reelId || '(not created yet)'}
                </div>
                <div>
                  <span className="font-medium">status:</span> {reel?.status ?? '(polling after generate)'}
                </div>
              </div>
            </div>

            <button
              className={buttonClassName({ variant: 'secondary' })}
              disabled={!reelId || reel?.status !== 'ready' || reelPublishing || igLoading || igConnected !== true}
              onClick={async () => {
                if (!reelId) return;
                setReelError(null);
                setReelPublishing(true);
                try {
                  await apiFetch('/api/reels/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ brandId: selectedBrandId, reelId }),
                  });
                } catch (e) {
                  setReelError(e instanceof Error ? e.message : 'Publish failed');
                } finally {
                  setReelPublishing(false);
                }
              }}
            >
              {reelPublishing ? 'Publishing…' : 'Publish reel'}
            </button>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">Reel preview</h3>
                <span className="text-xs text-zinc-500">{reel ? `status: ${reel.status}` : 'no reel yet'}</span>
              </div>

              <div className="mt-3 grid gap-3">
                {reelUploadUrl ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <img src={reelUploadUrl} alt="Input" className="h-56 w-full object-cover" />
                    <div className="px-3 py-2 text-xs text-zinc-600">Input image</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    Upload an image to preview it here.
                  </div>
                )}

                {reel?.video_url ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <video src={reel.video_url} className="h-56 w-full object-cover" controls />
                    <div className="px-3 py-2 text-xs text-zinc-600">Generated video</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    Generated video will appear once status becomes <span className="font-medium">ready</span>.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


