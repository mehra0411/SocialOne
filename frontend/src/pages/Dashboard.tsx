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
    <div className="space-y-6 font-sans from-gray-50 to-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">Welcome to SocialOne</h1>
              <p className="text-md text-primary font-medium">Create on-brand content faster — with or without AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Feed</h2>
              <p className="text-sm text-gray-500">Select a brand, generate a caption draft, then publish.</p>
            </div>
          </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Brand</label>
                {brandsLoading ? <span className="text-xs text-gray-500">Loading…</span> : null}
              </div>

              <select
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
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
                <div className="mt-2 rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">{brandsError}</div>
              ) : null}
              {!brandsLoading && brands.length === 0 ? (
                <div className="mt-2 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 border-2 border-indigo-200">
                  <div className="font-semibold text-indigo-900 mb-2">No brands yet</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <Link to="/brands" className={buttonClassName({ variant: 'primary' }) + ' shadow-md hover:shadow-lg transition-shadow'}>
                      Create Your First Brand
                    </Link>
                    <div className="text-xs text-indigo-800">
                      Brands help us understand your voice and audience before creating content.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-gray-900">Media</label>
              <div className="mt-1 grid gap-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors">
                  <input
                    type="radio"
                    name="mediaMode"
                    value="ai_generate"
                    checked={mediaMode === 'ai_generate'}
                    onChange={() => {
                      setImageError(null);
                      setMediaMode('ai_generate');
                      setPreviewImageUrl('');
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Generate image with AI
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors">
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
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Upload image and enhance with AI
                </label>

                {mediaMode === 'ai_enhance' ? (
                  <div className="mt-2 grid gap-1">
                    <label className="text-sm font-semibold text-gray-900">Upload image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="block w-full text-sm rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 cursor-pointer px-3 py-2 hover:from-indigo-200 hover:to-purple-200 transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
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
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-600 bg-green-50 rounded-lg p-2 border border-green-200">
                        <span className="truncate font-medium text-green-800">✓ Reference image selected</span>
                        <button
                          type="button"
                          className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                          onClick={() => setReferenceImageFile(null)}
                          disabled={generating}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Upload is required for this mode.</div>
                    )}
                  </div>
                ) : null}

                <div className="mt-2 grid gap-1">
                  <label className="text-sm font-semibold text-gray-900">Image Prompt</label>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                    placeholder="Describe the image you want…"
                    value={imagePrompt}
                    onChange={(e) => {
                      setImageError(null);
                      setImagePrompt(e.target.value);
                    }}
                  />
                  <div className="text-xs text-gray-500">Required for both modes.</div>
                </div>

                {imageError ? <div className="rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">{imageError}</div> : null}
              </div>
            </div>
            {/*<div className="grid gap-1">
              <label className="text-sm font-medium text-zinc-900">Caption Prompt (optional but recommended)</label>
              <textarea
                className="min-h-24 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="Any context for the caption (offer, tone, etc)…"
                value={captionPrompt}
                onChange={(e) => setCaptionPrompt(e.target.value)}
              />
            </div>*/}
            {error ? <div className="rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">{error}</div> : null}

            {igHint ? (
              <div className="rounded-xl bg-gradient-to-r from-violet-100 to-purple-100 p-3 text-sm text-violet-900 border border-violet-200">
                {igHint}{' '}
                <Link to="/brand/platforms" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Connect Instagram
                </Link>
                .
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row flex-wrap">
              <button
                className={buttonClassName({ variant: 'primary' }) + ' shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'}
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
                <Link to="/drafts" className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'}>
                  View Drafts
                </Link>
              ) : null}

              {hasBrands ? (
                <button
                  type="button"
                  className={buttonClassName({ variant: 'secondary' }) + ' shadow-md opacity-60 cursor-not-allowed'}
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Insights (Coming Soon)
                </button>
              ) : null}

              <button
                className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0'}
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
              <div className="rounded-xl bg-gradient-to-r from-green-500/90 to-emerald-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {publishSuccess}
                </div>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3">
            <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Draft preview</h3>
                  <span className="text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl px-3 py-1.5 shadow-md font-semibold">Preview</span>
              </div>

              <div className="mt-3 grid gap-3">
                <div className="text-xs text-gray-600 bg-indigo-50 rounded-lg p-2 border border-indigo-100">
                  <span className="font-semibold text-indigo-900">Brand:</span>{' '}
                  <span className="text-indigo-800">{selectedBrand?.name ?? 'Unknown'}</span>
                </div>

                {previewImageUrl ? (
                  <div className="overflow-hidden rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md">
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      className="h-70 w-full object-fill"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="px-3 py-2 text-xs text-indigo-700 font-medium bg-indigo-100">Image preview</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 text-sm text-indigo-800 border-2 border-indigo-200">
                    No image yet. Choose a media mode and click <span className="font-semibold text-indigo-900">Generate Post</span>.
                  </div>
                )}

                {previewCaption ? (() => {
                  // Split caption and hashtags
                  const lines = previewCaption.split('\n');
                  // Find first blank line
                  const blankIdx = lines.findIndex(line => line.trim() === '');
                  let caption, hashtags;
                  if (blankIdx !== -1) {
                    caption = lines.slice(0, blankIdx).join(' ').trim();
                    hashtags = lines.slice(blankIdx + 1).join(' ').trim();
                  } else {
                    // Fallback: treat last line as hashtags
                    caption = lines.slice(0, -1).join(' ').trim();
                    hashtags = lines[lines.length - 1].trim();
                  }
                  return (
                    <>
                      <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-3 text-sm text-indigo-900 whitespace-pre-wrap mb-2 border border-indigo-200 shadow-sm">
                        <span className="font-bold mr-2 text-indigo-700">Caption:</span>{caption}
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-3 text-sm text-blue-900 whitespace-pre-wrap border border-blue-200 shadow-sm">
                        <span className="font-bold mr-2 text-blue-700">Hashtags:</span>{hashtags}
                      </div>
                    </>
                  );
                })() : (
                  <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-3 text-sm text-indigo-800 border-2 border-indigo-200">
                    Caption will appear here after generation.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Reels Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Reels</h2>
              <p className="text-sm text-gray-500">Upload an image, generate a reel, poll status, then publish.</p>
            </div>
          </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-semibold text-gray-900">Input image</label>
              <input
                className="block w-full text-sm rounded-xl bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-200 cursor-pointer px-3 py-2 hover:from-violet-200 hover:to-purple-200 transition-colors file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setReelError(null);
                  const f = e.target.files?.[0] ?? null;
                  setReelFile(f);
                  setReelUploadUrl('');
                }}
              />
              <p className="text-xs text-gray-500">
                This uploads to Supabase Storage and uses the public URL as `input_image_url`.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row flex-wrap">
              <button
                className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'}
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
                className={buttonClassName({ variant: 'primary' }) + ' shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'}
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

            {reelError ? <div className="rounded-xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-3 text-sm font-medium text-white shadow-lg">{reelError}</div> : null}

            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4 text-sm text-violet-900 shadow-sm">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-800">brandId:</span>
                  <span className="text-violet-700">{selectedBrandId || '(none)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-800">input_image_url:</span>
                  <span className="text-violet-700 text-xs truncate max-w-[200px]">{reelUploadUrl || '(upload first)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-800">reelId:</span>
                  <span className="text-violet-700">{reelId || '(not created yet)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-800">status:</span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    reel?.status === 'ready' ? 'bg-green-500 text-white' :
                    reel?.status === 'generating' ? 'bg-amber-500 text-white' :
                    reel?.status === 'published' ? 'bg-blue-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {reel?.status ?? '(polling after generate)'}
                  </span>
                </div>
              </div>
            </div>

            <button
              className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0'}
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
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Reel preview</h3>
                <span className={`text-xs text-white rounded-xl px-3 py-1.5 shadow-md font-semibold ${
                  reel?.status === 'ready' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                  reel?.status === 'generating' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                  reel?.status === 'published' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}>
                  {reel ? `status: ${reel.status}` : 'no reel yet'}
                </span>
              </div>

              <div className="mt-3 grid gap-3">
                {reelUploadUrl ? (
                  <div className="overflow-hidden rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 shadow-md">
                    <img src={reelUploadUrl} alt="Input" className="h-56 w-full object-cover" />
                    <div className="px-3 py-2 text-xs text-violet-700 font-medium bg-violet-100">Input image</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-3 text-sm text-violet-800 border-2 border-violet-200">
                    Upload an image to preview it here.
                  </div>
                )}

                {reel?.video_url ? (
                  <div className="overflow-hidden rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 shadow-md">
                    <video src={reel.video_url} className="h-56 w-full object-cover" controls />
                    <div className="px-3 py-2 text-xs text-violet-700 font-medium bg-violet-100">Generated video</div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-3 text-sm text-violet-800 border-2 border-violet-200">
                    Generated video will appear once status becomes <span className="font-semibold text-violet-900">ready</span>.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}