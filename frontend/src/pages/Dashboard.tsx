import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
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

async function apiJsonWithStatus<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: T | null }> {
  const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!rawBase) throw new Error('VITE_API_BASE_URL is not set');
  const base = rawBase.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error('You are not authenticated. Please sign in again and retry.');

  const resp = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });

  let json: T | null = null;
  try {
    json = (await resp.json()) as T;
  } catch {
    json = null;
  }

  return { ok: resp.ok, status: resp.status, json };
}

export function DashboardPage() {
  const { activeBrandId, setActiveBrand } = useActiveBrand();

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');

  const [igLoading, setIgLoading] = useState(false);
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [igHint, setIgHint] = useState<string | null>(null);

  const [mediaMode, setMediaMode] = useState<'ai_generate' | 'ai_enhance'>('ai_generate');
  const [imagePrompt, setImagePrompt] = useState('');
  const [captionPrompt, setCaptionPrompt] = useState('');

  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  const [, setGeneratedImageUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState<string | null>(null);

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

  function sanitizeImagePrompt(raw: string): string {
    // Strip surrounding quotes (common when users paste prompts) and trim whitespace.
    // Keep it simple and deterministic.
    let s = raw.trim();
    s = s.replace(/^["'“”]+/, '').replace(/["'“”]+$/, '').trim();
    return s;
  }

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
              <label className="text-sm font-medium text-zinc-900">Media</label>
              <div className="mt-1 grid gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="radio"
                    name="mediaMode"
                    value="ai_generate"
                    checked={mediaMode === 'ai_generate'}
                    onChange={() => {
                      setImageError(null);
                      setMediaMode('ai_generate');
                      setReferenceImageUrl('');
                    }}
                  />
                  Generate image with AI
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="radio"
                    name="mediaMode"
                    value="ai_enhance"
                    checked={mediaMode === 'ai_enhance'}
                    onChange={() => {
                      setImageError(null);
                      setMediaMode('ai_enhance');
                      setReferenceImageFile(null);
                    }}
                  />
                  Upload image and enhance with AI
                </label>

                {mediaMode === 'ai_enhance' ? (
                  <div className="mt-2 grid gap-1">
                    <label className="text-sm font-medium text-zinc-900">Upload image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm"
                      disabled={generating}
                      onChange={async (e) => {
                        const file = e.target.files?.[0] ?? null;
                        setImageError(null);
                        if (!file) {
                          setReferenceImageFile(null);
                          return;
                        }

                        const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
                        if (!allowed.has(file.type)) {
                          setImageError('Upload must be a JPG, PNG, or WEBP file.');
                          e.currentTarget.value = '';
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setImageError('Upload must be 5MB or smaller.');
                          e.currentTarget.value = '';
                          return;
                        }

                        setReferenceImageFile(file);
                      }}
                    />
                    {referenceImageFile ? (
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-600">
                        <span className="truncate">Reference image selected</span>
                        <button
                          type="button"
                          className="font-medium text-[#4F46E5] hover:text-[#4338CA]"
                          onClick={() => setReferenceImageFile(null)}
                          disabled={generating}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">Upload is required for this mode.</div>
                    )}
                  </div>
                ) : null}

                <div className="mt-2 grid gap-1">
                  <label className="text-sm font-medium text-zinc-900">Image Prompt</label>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder="Describe the image you want…"
                    value={imagePrompt}
                    onChange={(e) => {
                      setImageError(null);
                      setImagePrompt(e.target.value);
                    }}
                  />
                  <div className="text-xs text-zinc-500">Required for both modes.</div>
                </div>

                {imageError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{imageError}</div> : null}
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Caption Prompt (optional but recommended)</label>
              <textarea
                className="min-h-24 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Any context for the caption (offer, tone, etc)…"
                value={captionPrompt}
                onChange={(e) => setCaptionPrompt(e.target.value)}
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
                disabled={
                  !selectedBrandId ||
                  generating ||
                  !sanitizeImagePrompt(imagePrompt) ||
                  (mediaMode === 'ai_enhance' && !referenceImageFile)
                }
                onClick={async () => {
                  setError(null);
                  setPublishSuccess(null);
                  setDraft(null);
                  setImageError(null);
                  setPreviewCaption(null);
                  setGenerating(true);
                  try {
                    const sanitizedPrompt = sanitizeImagePrompt(imagePrompt);

                    // Upload+enhance: send the reference image to the backend as part of /api/feed/generate.
                    if (mediaMode === 'ai_enhance') {
                      if (!referenceImageFile) {
                        setImageError('Upload is required for this mode.');
                        return;
                      }

                      const captionContext = captionPrompt.trim() || sanitizedPrompt;

                      const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
                      if (!rawBase) throw new Error('VITE_API_BASE_URL is not set');
                      const base = rawBase.replace(/\/+$/, '');
                      const url = `${base}/api/feed/generate`;

                      const { data } = await supabase.auth.getSession();
                      const accessToken = data.session?.access_token;
                      if (!accessToken) throw new Error('You are not authenticated. Please sign in again and retry.');

                      const form = new FormData();
                      form.set('brandId', selectedBrandId);
                      form.set('prompt', captionContext);
                      form.set('imagePrompt', sanitizedPrompt);
                      form.set('referenceImage', referenceImageFile);

                      const resp = await fetch(url, {
                        method: 'POST',
                        headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
                        body: form,
                      });

                      const post = (await resp.json().catch(() => null)) as FeedPost | null;
                      if (!resp.ok || !post) {
                        const msg = (post as any)?.message || `Request failed: ${resp.status}`;
                        setImageError(msg);
                        return;
                      }

                      setError(null);
                      setImageError(null);
                      setDraft(post);
                      setGeneratedImageUrl(post.image_url ?? '');
                      setPreviewImageUrl(post.image_url ?? null);
                      setPreviewCaption(post.caption ?? null);
                      return;
                    }

                    // Prompt-only: preview-first image generation via /api/feed/image/generate, then create the draft via /api/feed/generate.
                    const imgResp = await apiJsonWithStatus<{ imageUrl: string; revisedPrompt: string | null; imageMode: string }>(
                      '/api/feed/image/generate',
                      {
                        method: 'POST',
                        body: JSON.stringify({ brandId: selectedBrandId, prompt: sanitizedPrompt }),
                      }
                    );

                    if (!imgResp.ok) {
                      const msg =
                        (imgResp.json as any)?.message ||
                        (imgResp.json as any)?.error ||
                        `Request failed: ${imgResp.status}`;
                      if (imgResp.status === 429) {
                        setImageError(msg);
                      } else {
                        setImageError('Failed to generate image');
                      }
                      return;
                    }

                    const imageUrl = (imgResp.json as any)?.imageUrl as string | undefined;
                    const revised = (imgResp.json as any)?.revisedPrompt as string | null | undefined;
                    if (!imageUrl) {
                      setImageError('Failed to generate image');
                      return;
                    }

                    setGeneratedImageUrl(imageUrl);
                    setPreviewImageUrl(imageUrl);
                    if (revised && revised.trim()) setImagePrompt(revised.trim());

                    const captionContext = captionPrompt.trim() || (revised?.trim() || sanitizedPrompt);
                    const post = await apiFetch<FeedPost>('/api/feed/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        brandId: selectedBrandId,
                        imageUrl,
                        prompt: captionContext,
                      }),
                    });
                    setError(null);
                    setImageError(null);
                    setDraft(post);
                    setPreviewCaption(post.caption ?? null);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to generate');
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                {generating ? 'Generating…' : 'Generate Post'}
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
                  <span className="text-xs text-zinc-500">Preview</span>
              </div>

              <div className="mt-3 grid gap-3">
                <div className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700">Brand:</span>{' '}
                  {selectedBrand?.name ?? 'Unknown'}
                </div>

                {previewImageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      className="h-56 w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="px-3 py-2 text-xs text-zinc-600">Image preview</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    No image yet. Choose a media mode and click <span className="font-medium text-zinc-900">Generate Post</span>.
                  </div>
                )}

                {previewCaption ? (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-900 whitespace-pre-wrap">{previewCaption}</div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                    Caption will appear here after generation.
                  </div>
                )}
              </div>
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


