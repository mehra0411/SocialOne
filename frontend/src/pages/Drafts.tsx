import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { uploadImageAndGetPublicUrl } from '../lib/storage';
import { buttonClassName } from '../ui/button';
import { Skeleton } from '../ui/Skeleton';
import { useActiveBrand } from '../brands/activeBrand';
import { fetchInstagramPlatformStatus } from '../lib/platformStatus';

type BrandOption = { id: string; name: string };

type FeedPost = {
  id: string;
  brand_id: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  caption?: string | null;
  image_url?: string | null;
  image_prompt?: string | null;
  image_mode?: string | null;
  image_status?: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  retry_count: number;
  created_at: string;
};

type Reel = {
  id: string;
  brand_id: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'generating' | 'ready';
  caption?: string | null;
  input_image_url?: string | null;
  video_url?: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  retry_count: number;
  created_at: string;
};

type ApiBrand = { id: string; name: string | null };

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatStatusLabel(status: string): string {
  // Keep calm, human-readable labels.
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'publishing':
      return 'Publishing…';
    case 'published':
      return 'Published';
    case 'failed':
      return 'Failed';
    case 'ready':
      return 'Ready';
    case 'generating':
      return 'Generating…';
    default:
      return status;
  }
}

function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('unauthorized')) return 'Your session has expired. Please log in again.';
  if (lower.includes('forbidden')) return 'You don’t have access to this brand. Please choose a different brand.';
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network issue—please check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

function isAppAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return lower.includes('unauthorized') || lower.includes('forbidden');
}

function isInstagramAuthExpiredError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // We don't get a structured status code from apiFetch, so we classify based on the backend error message.
  if (lower.includes('instagram') && (lower.includes('expired') || lower.includes('token') || lower.includes('oauth'))) {
    return true;
  }
  if (lower.includes('token') && lower.includes('expired')) return true;
  if (lower.includes('reconnect') && lower.includes('instagram')) return true;
  return false;
}

function isInstagramMediaValidationError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // Heuristics for common Meta validation failures (format/size/duration/aspect/etc).
  return (
    lower.includes('meta create') ||
    lower.includes('meta publish')
  )
    ? lower.includes('format') ||
        lower.includes('duration') ||
        lower.includes('too long') ||
        lower.includes('too large') ||
        lower.includes('file size') ||
        lower.includes('resolution') ||
        lower.includes('aspect') ||
        lower.includes('ratio') ||
        lower.includes('bitrate') ||
        lower.includes('unsupported') ||
        lower.includes('invalid') ||
        lower.includes('requirements')
    : lower.includes('instagram requirements') ||
        lower.includes('media doesn’t meet') ||
        lower.includes('media does not meet') ||
        false;
}

function extractSpecificReason(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  // Try to strip our adapter prefixes and remove Meta codes/subcodes for a cleaner, user-facing reason.
  let s = msg;
  s = s.replace(/^Meta (create (reels )?container failed|publish failed):\s*/i, '');
  s = s.replace(/\s+code=\d+/gi, '');
  s = s.replace(/\s+subcode=\d+/gi, '');
  s = s.trim();
  if (!s || s === msg) return s || null;
  return s;
}

type PostType = 'feed' | 'reel';

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

export function DraftsPage() {
  const { activeBrandId, setActiveBrand } = useActiveBrand();

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string>('');
  const [tab, setTab] = useState<PostType>('feed');

  const [igLoading, setIgLoading] = useState(false);
  const [igConnected, setIgConnected] = useState<boolean | null>(null);
  const [igHint, setIgHint] = useState<string | null>(null);

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    postType: PostType;
    postId: string;
    currentScheduledAt: string | null;
  }>({ open: false, postType: 'feed', postId: '', currentScheduledAt: null });
  const [scheduleValue, setScheduleValue] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const [publishNowModal, setPublishNowModal] = useState<{ open: boolean; postType: PostType; postId: string }>({
    open: false,
    postType: 'feed',
    postId: '',
  });
  const [publishNowSubmitting, setPublishNowSubmitting] = useState(false);
  const [publishNowError, setPublishNowError] = useState<string | null>(null);
  const [publishNowSuccess, setPublishNowSuccess] = useState<string | null>(null);
  const [publishNowIgAuthExpired, setPublishNowIgAuthExpired] = useState(false);
  const [publishNowMediaErrorDetail, setPublishNowMediaErrorDetail] = useState<string | null>(null);
  const [publishNowTemporaryFailure, setPublishNowTemporaryFailure] = useState(false);
  const [publishBlockedAttempt, setPublishBlockedAttempt] = useState(false);

  const [viewModal, setViewModal] = useState<{
    open: boolean;
    postType: PostType;
    record: FeedPost | Reel | null;
  }>({ open: false, postType: 'feed', record: null });

  // AI Image (Feed only) state (scoped to the currently viewed draft)
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [aiReferenceImageUrl, setAiReferenceImageUrl] = useState<string>('');
  const [aiUploadingReference, setAiUploadingReference] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiRemoving, setAiRemoving] = useState(false);
  const [aiImageError, setAiImageError] = useState<string | null>(null);
  const [aiGeneratedImageUrl, setAiGeneratedImageUrl] = useState<string>('');

  // Row-scoped UI lock for in-progress publish actions (prevents duplicate submissions & disables only that row).
  const [rowPublishBusy, setRowPublishBusy] = useState<Record<string, boolean>>({});

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; feedPostId: string }>({ open: false, feedPostId: '' });
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function rowKey(postType: PostType, postId: string) {
    return `${postType}:${postId}`;
  }

  useEffect(() => {
    if (!publishNowSuccess) return;
    const t = window.setTimeout(() => setPublishNowSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [publishNowSuccess]);

  useEffect(() => {
    // Clear the explicit "not connected" publish attempt banner when brand/connection changes.
    setPublishBlockedAttempt(false);
  }, [brandId, igConnected]);

  useEffect(() => {
    // Initialize AI Image state when the view modal opens or switches records.
    if (!viewModal.open || viewModal.postType !== 'feed' || !viewModal.record) return;
    const r = viewModal.record as FeedPost;
    setAiImageError(null);
    setAiGenerating(false);
    setAiRemoving(false);
    setAiUploadingReference(false);
    setAiReferenceImageUrl('');
    setAiImagePrompt((r.image_prompt ?? '').trim());
    setAiGeneratedImageUrl((r.image_url ?? '').trim());
  }, [viewModal.open, viewModal.postType, viewModal.record]);

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
        setBrandsError(friendlyErrorMessage(e));
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
    if (activeBrandId && brands.some((b) => b.id === activeBrandId)) {
      setBrandId(activeBrandId);
      return;
    }
    if (brandId && brands.some((b) => b.id === brandId)) return;
    setBrandId(brands[0]?.id ?? '');
  }, [activeBrandId, brandId, brands]);

  const brandName = useMemo(() => brands.find((b) => b.id === brandId)?.name ?? '', [brands, brandId]);

  useEffect(() => {
    if (!brandId) {
      setIgConnected(null);
      setIgHint(null);
      return;
    }

    let mounted = true;
    setIgHint(null);
    setIgLoading(true);
    (async () => {
      try {
        const status = await fetchInstagramPlatformStatus(brandId);
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
  }, [brandId]);

  async function refresh() {
    if (!brandId) return;
    setError(null);
    setLoading(true);
    try {
      const [feedResp, reelsResp] = await Promise.all([
        apiFetch<{ feedPosts: FeedPost[] }>(`/api/feed/${brandId}/posts`),
        apiFetch<{ reels: Reel[] }>(`/api/reels/${brandId}/posts`),
      ]);
      setFeedPosts(feedResp.feedPosts);
      setReels(reelsResp.reels);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  const rows = tab === 'feed' ? feedPosts : reels;
  const scheduledCount = useMemo(() => rows.filter((r: any) => r.status === 'scheduled').length, [rows]);
  const hasAny = rows.length > 0;

  return (
    <div className="space-y-6 font-sans from-gray-50 to-white min-h-screen">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden px-0 py-2 sm:px-6 lg:px-0 mb-3">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-3xl font-bold text-primary text-[#4F46E5]">My Drafts</h1>
              <p className="text-md text-primary font-medium">
                Schedule posts, view status, and manually override publishing (admin/operator usage).
              </p>
            </div>
            <button className={buttonClassName({ variant: 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'} onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Brand Selection Card */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Select Brand</h2>
              <p className="text-sm text-gray-500">Choose a brand to view and manage drafts</p>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-gray-700">Brand</label>
            <select
              className="w-full max-w-md rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-indigo-50/50 focus:ring-4 focus:ring-indigo-500/20"
              value={brandId}
              onChange={(e) => {
                const id = e.target.value;
                setBrandId(id);
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
            {brandsLoading ? <p className="text-xs text-zinc-500">Loading brands…</p> : null}
            {brandsError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{brandsError}</div> : null}
            {!brandsLoading && brands.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
                <div className="font-medium text-zinc-900">No brands yet</div>
                <div className="text-zinc-600">
                  Create one on{' '}
                  <Link to="/brands" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
                    My Brands
                  </Link>{' '}
                  to start scheduling posts.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {igHint ? (
        <div className="rounded-2xl bg-gradient-to-r from-violet-100 to-purple-100 p-4 text-sm text-violet-900 border border-violet-200 shadow-md">
          {igHint}{' '}
          <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
            Connect Instagram
          </Link>
          .
        </div>
      ) : null}

      {publishBlockedAttempt ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 p-4 text-sm text-amber-900 border border-amber-200 shadow-md">
          <div>
            Instagram is not connected for this brand.{' '}
            <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
              Connect Instagram
            </Link>
          </div>
          <button
            type="button"
            className="text-amber-900/70 hover:text-amber-900"
            onClick={() => setPublishBlockedAttempt(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {publishNowSuccess ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-green-500/90 to-emerald-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
          <div>{publishNowSuccess}</div>
          <button
            type="button"
            className="text-white/90 hover:text-white"
            onClick={() => setPublishNowSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 border-white/30 ml-2'}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {/* Posts Table Section */}
      <section className="group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {tab === 'feed' ? 'Feed Posts' : 'Reels'} for {brandName || 'Untitled brand'}
                </h2>
                <p className="text-sm text-gray-500">Statuses: draft / scheduled / publishing / published / failed</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={buttonClassName({ variant: tab === 'feed' ? 'primary' : 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'}
                onClick={() => setTab('feed')}
              >
                Feed Posts
              </button>
              <button
                className={buttonClassName({ variant: tab === 'reel' ? 'primary' : 'secondary' }) + ' shadow-md hover:shadow-lg transition-shadow'}
                onClick={() => setTab('reel')}
              >
                Reels
              </button>
              <span className="text-xs text-white bg-violet-600 rounded-xl px-3 py-1.5 font-semibold shadow-md">
                {loading ? 'Loading…' : `${rows.length} items`}
              </span>
            </div>
          </div>

        <div className="overflow-x-auto rounded-2xl border border-violet-200/50 bg-gradient-to-br from-white to-violet-50/30 shadow-lg">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white">
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider first:rounded-tl-2xl">ID</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Platform</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Scheduled</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Published</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Retries</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Created</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider last:rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="bg-white/50 hover:bg-violet-50/50 transition-colors">
                      <td className="py-4 px-4"><Skeleton className="h-4 w-52" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-10" /></td>
                      <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-24 rounded-xl" />
                          <Skeleton className="h-8 w-28 rounded-xl" />
                        </div>
                      </td>
                    </tr>
                  ))
                : rows.map((r: any, index: number) => {
                const status = r.status as string;
                const isPublishingOrPublished = status === 'publishing' || status === 'published';
                const canSchedule = !isPublishingOrPublished;
                const canPublishNow = status === 'scheduled' || status === 'failed';
                const platform = r.platform ?? 'instagram';
                const platformLabel = platform === 'instagram' ? 'Instagram' : platform;
                const isRowPublishing = Boolean(rowPublishBusy[rowKey(tab, r.id)]) || status === 'publishing';
                const actionsBusy = scheduleSubmitting || igLoading || isRowPublishing;
                const publishBlocked = igConnected !== true;

                const caption = typeof r.caption === 'string' ? r.caption.trim() : '';
                const hasCaption = caption.length > 0;
                const hasRequiredMedia =
                  tab === 'feed'
                    ? typeof r.image_url === 'string' && r.image_url.trim().length > 0
                    : typeof r.video_url === 'string' && r.video_url.trim().length > 0;
                const contentIncomplete = !hasCaption || !hasRequiredMedia;
                const publishDisabledReason: 'ig' | 'incomplete' | null = publishBlocked
                  ? 'ig'
                  : contentIncomplete
                    ? 'incomplete'
                    : null;

                return (
                  <tr key={r.id} className={`bg-white/70 hover:bg-gradient-to-r hover:from-violet-50/80 hover:to-purple-50/80 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/50' : 'bg-white/70'}`}>
                    <td className="py-4 px-4 font-mono text-xs font-medium text-zinc-800">{r.id}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 font-medium text-xs border border-violet-200">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4]"
                        />
                        {platformLabel}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={[
                        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-md',
                        status === 'published' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                        status === 'publishing' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' :
                        status === 'scheduled' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' :
                        status === 'failed' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' :
                        status === 'generating' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' :
                        status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' :
                        'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                      ].join(' ')}>
                        {formatStatusLabel(status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-zinc-700">{formatDate(r.scheduled_at ?? null)}</td>
                    <td className="py-4 px-4 text-xs font-medium text-zinc-700">{formatDate(r.published_at ?? null)}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-semibold text-xs">
                        {r.retry_count ?? 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-zinc-700">{formatDate(r.created_at ?? null)}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                        <button
                          className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-sm hover:shadow-md transition-shadow whitespace-nowrap'}
                          disabled={actionsBusy}
                          onClick={() => {
                            setViewModal({ open: true, postType: tab, record: r as FeedPost | Reel });
                          }}
                        >
                          View
                        </button>
                        <button
                          className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-sm hover:shadow-md transition-shadow whitespace-nowrap'}
                          disabled={!canSchedule || actionsBusy}
                          onClick={() => {
                            setScheduleError(null);
                            setScheduleValue('');
                            setScheduleModal({
                              open: true,
                              postType: tab,
                              postId: r.id,
                              currentScheduledAt: r.scheduled_at ?? null,
                            });
                          }}
                        >
                          Schedule
                        </button>
                        <button
                          className={buttonClassName({ variant: 'primary', size: 'sm', className: 'rounded-lg' }) + ' shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 whitespace-nowrap'}
                          disabled={!canPublishNow || isPublishingOrPublished || actionsBusy || publishDisabledReason === 'incomplete'}
                          onClick={() => {
                            setPublishNowError(null);
                            if (publishBlocked) {
                              setPublishBlockedAttempt(true);
                              return;
                            }
                            setPublishNowModal({ open: true, postType: tab, postId: r.id });
                          }}
                        >
                          {isRowPublishing ? 'Publishing…' : 'Publish now'}
                        </button>
                        <button
                          className={buttonClassName({ variant: 'secondary', size: 'sm' }) + ' shadow-sm hover:shadow-md transition-shadow whitespace-nowrap'}
                          disabled={
                            tab !== 'feed' ||
                            status !== 'draft' ||
                            actionsBusy ||
                            deleteSubmitting
                          }
                          onClick={() => {
                            if (tab !== 'feed') return;
                            if (status !== 'draft') return;
                            setDeleteError(null);
                            setDeleteModal({ open: true, feedPostId: r.id });
                          }}
                          title={tab !== 'feed' ? 'Only feed drafts can be deleted here' : status !== 'draft' ? 'Only drafts can be deleted' : undefined}
                        >
                          Delete
                        </button>
                        </div>

                        {publishDisabledReason === 'ig' ? (
                          <div className="text-xs text-zinc-500">Connect Instagram to publish this post.</div>
                        ) : null}
                        {publishDisabledReason === 'incomplete' ? (
                          <div className="text-xs text-zinc-500">Add caption and media before publishing.</div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="py-12 px-4 text-center" colSpan={8}>
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-zinc-900">No posts yet</div>
                      <div className="text-sm text-zinc-600">No feed posts or reels found for this brand.</div>
                      <div className="text-sm text-zinc-500">
                        Next: create a draft from <span className="font-medium text-violet-600">Dashboard</span>.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!loading && hasAny && scheduledCount === 0 ? (
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-100 to-purple-100 p-4 text-sm text-violet-900 border border-violet-200 shadow-md">
            <div className="font-medium text-violet-900">No scheduled posts</div>
            <div className="text-violet-800">
              Next: pick a post and use <span className="font-medium text-violet-900">Schedule</span> to set a future publish time.
            </div>
          </div>
        ) : null}
        </div>
      </section>

      {/* Delete draft modal (feed only) */}
      {deleteModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-900">Delete Draft</h3>
                <p className="text-sm text-zinc-600">Delete this draft? This cannot be undone.</p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setDeleteModal({ open: false, feedPostId: '' })}
                aria-label="Close"
                disabled={deleteSubmitting}
              >
                ✕
              </button>
            </div>

            {deleteError ? (
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">{deleteError}</div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className={buttonClassName({ variant: 'secondary' })}
                onClick={() => setDeleteModal({ open: false, feedPostId: '' })}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ variant: 'primary' })}
                disabled={deleteSubmitting}
                onClick={async () => {
                  setDeleteError(null);
                  setDeleteSubmitting(true);
                  try {
                    await apiFetch(`/api/feed/${deleteModal.feedPostId}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandId }),
                    });
                    setFeedPosts((prev) => prev.filter((p) => p.id !== deleteModal.feedPostId));
                    setDeleteModal({ open: false, feedPostId: '' });
                  } catch (e) {
                    setDeleteError(friendlyErrorMessage(e));
                  } finally {
                    setDeleteSubmitting(false);
                  }
                }}
              >
                {deleteSubmitting ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Draft view modal (read-only) */}
      {viewModal.open && viewModal.record ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-900">Draft details</h3>
                <p className="text-sm text-zinc-600">
                  Read-only preview (no editing or publishing from this view).
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setViewModal({ open: false, postType: 'feed', record: null })}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-3 text-sm text-indigo-900 border border-indigo-200 shadow-sm">
                  <div className="text-xs font-semibold text-indigo-700">Brand</div>
                  <div className="mt-1 font-medium">{brandName || 'Unknown brand'}</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-3 text-sm text-violet-900 border border-violet-200 shadow-sm">
                  <div className="text-xs font-semibold text-violet-700">Status</div>
                  <div className="mt-1 font-medium">{formatStatusLabel((viewModal.record as any).status)}</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 p-3 text-sm text-pink-900 border border-pink-200 shadow-sm">
                  <div className="text-xs font-semibold text-pink-700">Created</div>
                  <div className="mt-1 font-medium">{formatDate((viewModal.record as any).created_at ?? null)}</div>
                </div>
              </div>

              {viewModal.postType === 'feed' && (aiGeneratedImageUrl || (viewModal.record as FeedPost).image_url) ? (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                  <img
                    src={aiGeneratedImageUrl || ((viewModal.record as FeedPost).image_url ?? '')}
                    alt="Draft image"
                    className="max-h-[420px] w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="px-3 py-2 text-xs text-zinc-600">Image preview</div>
                </div>
              ) : null}

              {viewModal.postType === 'feed' ? (
                <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-violet-900">AI Image</div>
                      <div className="mt-1 text-xs text-violet-700">
                        Generate an AI image for this feed draft. This is an explicit action (no auto-generate).
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-1">
                      <label className="text-sm font-medium text-zinc-900">Image prompt</label>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                        value={aiImagePrompt}
                        onChange={(e) => {
                          setAiImageError(null);
                          setAiImagePrompt(e.target.value);
                        }}
                        placeholder="Describe the image you want…"
                      />
                      <div className="text-xs text-zinc-500">Required. Used for generation and regeneration.</div>
                    </div>

                    <div className="grid gap-1">
                      <label className="text-sm font-medium text-zinc-900">Reference image (optional)</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="block w-full text-sm"
                        disabled={aiUploadingReference || aiGenerating || aiRemoving}
                        onChange={async (e) => {
                          const file = e.target.files?.[0] ?? null;
                          setAiImageError(null);
                          if (!file) {
                            setAiReferenceImageUrl('');
                            return;
                          }

                          const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
                          if (!allowed.has(file.type)) {
                            setAiImageError('Reference image must be a JPG, PNG, or WEBP file.');
                            e.currentTarget.value = '';
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setAiImageError('Reference image must be 5MB or smaller.');
                            e.currentTarget.value = '';
                            return;
                          }

                          setAiUploadingReference(true);
                          try {
                            const url = await uploadImageAndGetPublicUrl(file);
                            setAiReferenceImageUrl(url);
                          } catch {
                            setAiImageError('Failed to upload reference image.');
                            e.currentTarget.value = '';
                          } finally {
                            setAiUploadingReference(false);
                          }
                        }}
                      />
                      {aiUploadingReference ? <div className="text-xs text-zinc-500">Uploading reference…</div> : null}
                      {aiReferenceImageUrl ? (
                        <div className="flex items-center justify-between gap-2 text-xs text-zinc-600">
                          <span className="truncate">Uploaded reference image</span>
                          <button
                            type="button"
                            className="font-medium text-[#4F46E5] hover:text-[#4338CA]"
                            onClick={() => setAiReferenceImageUrl('')}
                            disabled={aiUploadingReference || aiGenerating || aiRemoving}
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">Optional. If provided, we’ll use image-edit mode.</div>
                      )}
                    </div>

                    {aiImageError ? <div className="rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">{aiImageError}</div> : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {!aiGeneratedImageUrl ? (
                        <button
                          type="button"
                          className={buttonClassName({ variant: 'primary' })}
                          disabled={!aiImagePrompt.trim() || aiGenerating || aiUploadingReference || aiRemoving}
                          onClick={async () => {
                            const record = viewModal.record as FeedPost;
                            setAiImageError(null);
                            setAiGenerating(true);
                            try {
                              const resp = await apiJsonWithStatus<{ imageUrl: string; revisedPrompt: string | null; imageMode: string }>(
                                '/api/feed/image/generate',
                                {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    brandId,
                                    feedDraftId: record.id,
                                    prompt: aiImagePrompt.trim(),
                                    referenceImageUrl: aiReferenceImageUrl || undefined,
                                  }),
                                }
                              );

                              if (!resp.ok) {
                                const msg =
                                  (resp.json as any)?.message ||
                                  (resp.json as any)?.error ||
                                  (resp.status === 429 ? 'Limit reached.' : null) ||
                                  `Request failed: ${resp.status}`;
                                if (resp.status === 429) {
                                  setAiImageError(msg);
                                } else {
                                  setAiImageError('Failed to generate image');
                                }
                                return;
                              }

                              const imageUrl = (resp.json as any)?.imageUrl as string | undefined;
                              const revised = (resp.json as any)?.revisedPrompt as string | null | undefined;
                              if (!imageUrl) {
                                setAiImageError('Failed to generate image');
                                return;
                              }

                              setAiGeneratedImageUrl(imageUrl);
                              if (revised && revised.trim()) setAiImagePrompt(revised.trim());

                              // Update local draft state so list/preview stay in sync without refetching.
                              setFeedPosts((prev) => prev.map((p) => (p.id === record.id ? { ...p, image_url: imageUrl } : p)));
                              setViewModal((prev) =>
                                prev.open && prev.postType === 'feed' && prev.record && (prev.record as FeedPost).id === record.id
                                  ? { ...prev, record: { ...(prev.record as FeedPost), image_url: imageUrl, image_prompt: revised ?? (prev.record as FeedPost).image_prompt ?? null } }
                                  : prev
                              );
                            } catch {
                              setAiImageError('Failed to generate image');
                            } finally {
                              setAiGenerating(false);
                            }
                          }}
                        >
                          {aiGenerating ? 'Generating…' : 'Generate Image'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={buttonClassName({ variant: 'primary' }) + ' shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'}
                            disabled={!aiImagePrompt.trim() || aiGenerating || aiUploadingReference || aiRemoving}
                            onClick={async () => {
                              const record = viewModal.record as FeedPost;
                              setAiImageError(null);
                              setAiGenerating(true);
                              try {
                                const resp = await apiJsonWithStatus<{ imageUrl: string; revisedPrompt: string | null; imageMode: string }>(
                                  '/api/feed/image/generate',
                                  {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      brandId,
                                      feedDraftId: record.id,
                                      prompt: aiImagePrompt.trim(),
                                      referenceImageUrl: aiReferenceImageUrl || undefined,
                                    }),
                                  }
                                );

                                if (!resp.ok) {
                                  const msg =
                                    (resp.json as any)?.message ||
                                    (resp.json as any)?.error ||
                                    (resp.status === 429 ? 'Limit reached.' : null) ||
                                    `Request failed: ${resp.status}`;
                                  if (resp.status === 429) {
                                    setAiImageError(msg);
                                  } else {
                                    setAiImageError('Failed to generate image');
                                  }
                                  return;
                                }

                                const imageUrl = (resp.json as any)?.imageUrl as string | undefined;
                                const revised = (resp.json as any)?.revisedPrompt as string | null | undefined;
                                if (!imageUrl) {
                                  setAiImageError('Failed to generate image');
                                  return;
                                }

                                setAiGeneratedImageUrl(imageUrl);
                                if (revised && revised.trim()) setAiImagePrompt(revised.trim());

                                setFeedPosts((prev) => prev.map((p) => (p.id === record.id ? { ...p, image_url: imageUrl } : p)));
                                setViewModal((prev) =>
                                  prev.open && prev.postType === 'feed' && prev.record && (prev.record as FeedPost).id === record.id
                                    ? { ...prev, record: { ...(prev.record as FeedPost), image_url: imageUrl, image_prompt: revised ?? (prev.record as FeedPost).image_prompt ?? null } }
                                    : prev
                                );
                              } catch {
                                setAiImageError('Failed to generate image');
                              } finally {
                                setAiGenerating(false);
                              }
                            }}
                          >
                            {aiGenerating ? 'Generating…' : 'Regenerate'}
                          </button>
                          <button
                            type="button"
                            className={buttonClassName({ variant: 'secondary' })}
                            disabled={aiRemoving || aiGenerating || aiUploadingReference}
                            onClick={async () => {
                              const record = viewModal.record as FeedPost;
                              setAiImageError(null);
                              setAiRemoving(true);
                              try {
                                const resp = await apiJsonWithStatus<{ success: true }>(
                                  '/api/feed/image/remove',
                                  {
                                    method: 'POST',
                                    body: JSON.stringify({ brandId, feedDraftId: record.id }),
                                  }
                                );

                                if (!resp.ok) {
                                  setAiImageError('Failed to remove image');
                                  return;
                                }

                                setAiGeneratedImageUrl('');
                                setFeedPosts((prev) => prev.map((p) => (p.id === record.id ? { ...p, image_url: null } : p)));
                                setViewModal((prev) =>
                                  prev.open && prev.postType === 'feed' && prev.record && (prev.record as FeedPost).id === record.id
                                    ? { ...prev, record: { ...(prev.record as FeedPost), image_url: null } }
                                    : prev
                                );
                              } catch {
                                setAiImageError('Failed to remove image');
                              } finally {
                                setAiRemoving(false);
                              }
                            }}
                          >
                            {aiRemoving ? 'Removing…' : 'Remove'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-semibold text-violet-700 mb-2">Caption</div>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4 text-sm text-violet-900 shadow-sm">
                  {(viewModal.record as any).caption?.trim?.() ? (viewModal.record as any).caption : '(empty caption)'}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className={buttonClassName({ variant: 'secondary' })}
                onClick={() => setViewModal({ open: false, postType: 'feed', record: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Schedule modal */}
      {scheduleModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-black/5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900">Schedule {scheduleModal.postType}</h3>
              <p className="text-sm text-zinc-600">Choose when this post should be published. You can override later.</p>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-medium text-zinc-900">Scheduled datetime</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Current: {formatDate(scheduleModal.currentScheduledAt)} (optional)
              </p>
              {scheduleError ? <div className="rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">{scheduleError}</div> : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className={buttonClassName({ variant: 'secondary' })}
                onClick={() => setScheduleModal({ open: false, postType: 'feed', postId: '', currentScheduledAt: null })}
                disabled={scheduleSubmitting}
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ variant: 'primary' })}
                disabled={scheduleSubmitting}
                onClick={async () => {
                  setScheduleError(null);
                  if (!scheduleValue) {
                    setScheduleError('Please select a date and time.');
                    return;
                  }
                  const dt = new Date(scheduleValue);
                  if (!Number.isFinite(dt.getTime())) {
                    setScheduleError('That date/time doesn’t look valid. Please try again.');
                    return;
                  }
                  if (dt.getTime() <= Date.now()) {
                    setScheduleError('Scheduled time must be in the future.');
                    return;
                  }

                  setScheduleSubmitting(true);
                  try {
                    const scheduledAt = dt.toISOString();
                    if (scheduleModal.postType === 'feed') {
                      await apiFetch('/api/feed/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brandId, feedPostId: scheduleModal.postId, scheduledAt }),
                      });
                    } else {
                      await apiFetch('/api/reels/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brandId, reelId: scheduleModal.postId, scheduledAt }),
                      });
                    }
                    await refresh();
                    setScheduleModal({ open: false, postType: 'feed', postId: '', currentScheduledAt: null });
                  } catch (e) {
                    setScheduleError(friendlyErrorMessage(e));
                  } finally {
                    setScheduleSubmitting(false);
                  }
                }}
              >
                {scheduleSubmitting ? 'Scheduling…' : 'Confirm schedule'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Publish now modal */}
      {publishNowModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl ring-1 ring-black/5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900">Confirm Publish</h3>
              <p className="text-sm text-zinc-600">
                You’re about to publish this post to Instagram for Brand: {brandName || 'Untitled brand'}
              </p>
            </div>

            {publishNowError ? (
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-red-500/90 to-rose-600/90 backdrop-blur-sm p-4 text-sm font-medium text-white shadow-lg">
                <div>{publishNowError}</div>
                {publishNowMediaErrorDetail ? <div className="mt-1 text-xs text-white/90">{publishNowMediaErrorDetail}</div> : null}
                {publishNowTemporaryFailure ? (
                  <div className="mt-2 text-xs text-white/90">Your draft is safe. Please try again.</div>
                ) : null}
              </div>
            ) : null}
            {publishNowIgAuthExpired ? (
              <div className="mt-2 text-sm text-zinc-700">
                <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
                  Reconnect Instagram
                </Link>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className={buttonClassName({ variant: 'secondary' })}
                onClick={() => setPublishNowModal({ open: false, postType: 'feed', postId: '' })}
                disabled={publishNowSubmitting}
              >
                Cancel
              </button>
              <button
                className={buttonClassName({ variant: 'primary' })}
                disabled={publishNowSubmitting}
                onClick={async () => {
                  const k = rowKey(publishNowModal.postType, publishNowModal.postId);
                  setPublishNowError(null);
                  setPublishNowSuccess(null);
                  setPublishNowIgAuthExpired(false);
                  setPublishNowMediaErrorDetail(null);
                  setPublishNowTemporaryFailure(false);
                  setPublishNowSubmitting(true);
                  setRowPublishBusy((prev) => ({ ...prev, [k]: true }));
                  try {
                    if (publishNowModal.postType === 'feed') {
                      await apiFetch('/api/feed/publish-now', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brandId, feedPostId: publishNowModal.postId }),
                      });
                    } else {
                      await apiFetch('/api/reels/publish-now', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brandId, reelId: publishNowModal.postId }),
                      });
                    }
                    await refresh();
                    setPublishNowSuccess('Published successfully to Instagram');
                    setPublishNowModal({ open: false, postType: 'feed', postId: '' });
                  } catch (e) {
                    if (isInstagramAuthExpiredError(e)) {
                      setPublishNowIgAuthExpired(true);
                      setPublishNowError('Instagram connection expired. Please reconnect to continue.');
                    } else if (isInstagramMediaValidationError(e)) {
                      setPublishNowError('This media doesn’t meet Instagram requirements.');
                      const reason = extractSpecificReason(e);
                      setPublishNowMediaErrorDetail(reason ? `Reason: ${reason}` : null);
                    } else {
                      // For generic/network/5xx failures, show a calm, reassuring message.
                      if (isAppAuthError(e)) {
                        setPublishNowError(friendlyErrorMessage(e));
                      } else {
                        setPublishNowError('We couldn’t publish this post due to a temporary issue.');
                        setPublishNowTemporaryFailure(true);
                      }
                    }
                  } finally {
                    setPublishNowSubmitting(false);
                    setRowPublishBusy((prev) => {
                      const next = { ...prev };
                      delete next[k];
                      return next;
                    });
                  }
                }}
              >
                {publishNowSubmitting ? 'Publishing…' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


