import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">My Drafts</h1>
          <p className="text-sm text-zinc-600">
            Schedule posts, view status, and manually override publishing (admin/operator usage).
          </p>
        </div>

        <button className={buttonClassName({ variant: 'secondary' })} onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-zinc-900">Brand</label>
        <select
          className="w-full max-w-md rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
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

      {igHint ? (
        <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
          {igHint}{' '}
          <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
            Connect Instagram
          </Link>
          .
        </div>
      ) : null}

      {publishBlockedAttempt ? (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800">
          <div>
            Instagram is not connected for this brand.{' '}
            <Link to="/brand/platforms" className="font-medium text-[#4F46E5] hover:text-[#4338CA]">
              Connect Instagram
            </Link>
          </div>
          <button
            type="button"
            className="text-zinc-600 hover:text-zinc-900"
            onClick={() => setPublishBlockedAttempt(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {publishNowSuccess ? (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <div>{publishNowSuccess}</div>
          <button
            type="button"
            className="text-emerald-900/70 hover:text-emerald-900"
            onClick={() => setPublishNowSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {error ? (
        <div className="flex">
          <button
            className={buttonClassName({ variant: 'secondary' })}
            onClick={() => void refresh()}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          className={buttonClassName({ variant: tab === 'feed' ? 'primary' : 'secondary' })}
          onClick={() => setTab('feed')}
        >
          Feed Posts
        </button>
        <button
          className={buttonClassName({ variant: tab === 'reel' ? 'primary' : 'secondary' })}
          onClick={() => setTab('reel')}
        >
          Reels
        </button>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {tab === 'feed' ? 'Feed posts' : 'Reels'} for {brandName || 'Untitled brand'}
            </h2>
            <p className="text-sm text-zinc-600">Statuses: draft / scheduled / publishing / published / failed</p>
          </div>
          <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${rows.length} items`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Platform</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Scheduled</th>
                <th className="py-2 pr-4">Published</th>
                <th className="py-2 pr-4">Retries</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-b border-zinc-100">
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-52" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-10" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-24 rounded-xl" />
                          <Skeleton className="h-8 w-28 rounded-xl" />
                        </div>
                      </td>
                    </tr>
                  ))
                : rows.map((r: any) => {
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
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 font-mono text-xs text-zinc-700">{r.id}</td>
                    <td className="py-3 pr-4 text-zinc-700">{platform}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {formatStatusLabel(status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-zinc-600">{formatDate(r.scheduled_at ?? null)}</td>
                    <td className="py-3 pr-4 text-xs text-zinc-600">{formatDate(r.published_at ?? null)}</td>
                    <td className="py-3 pr-4 text-xs text-zinc-600">{r.retry_count ?? 0}</td>
                    <td className="py-3 pr-4 text-xs text-zinc-600">{formatDate(r.created_at ?? null)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                          <span className="truncate">
                            <span className="font-medium text-zinc-700">Brand:</span> {brandName || 'Untitled brand'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 rounded-[3px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#515BD4]"
                            />
                            {platformLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                        <button
                          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
                          disabled={actionsBusy}
                          onClick={() => {
                            setViewModal({ open: true, postType: tab, record: r as FeedPost | Reel });
                          }}
                        >
                          View
                        </button>
                        <button
                          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
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
                          className={buttonClassName({ variant: 'primary', size: 'sm', className: 'rounded-lg' })}
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
                          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
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
                  <td className="py-6 text-sm text-zinc-600" colSpan={8}>
                    <div className="space-y-1">
                      <div className="font-medium text-zinc-900">No posts yet</div>
                      <div>No feed posts or reels found for this brand.</div>
                      <div className="text-zinc-600">
                        Next: create a draft from <span className="font-medium text-zinc-900">Dashboard</span>.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!loading && hasAny && scheduledCount === 0 ? (
          <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
            <div className="font-medium text-zinc-900">No scheduled posts</div>
            <div className="text-zinc-600">
              Next: pick a post and use <span className="font-medium text-zinc-900">Schedule</span> to set a future publish time.
            </div>
          </div>
        ) : null}
      </section>

      {/* Delete draft modal (feed only) */}
      {deleteModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
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
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>
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
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
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
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800">
                  <div className="text-xs font-medium text-zinc-600">Brand</div>
                  <div className="mt-1">{brandName || 'Unknown brand'}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800">
                  <div className="text-xs font-medium text-zinc-600">Status</div>
                  <div className="mt-1">{formatStatusLabel((viewModal.record as any).status)}</div>
                </div>
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800">
                  <div className="text-xs font-medium text-zinc-600">Created</div>
                  <div className="mt-1">{formatDate((viewModal.record as any).created_at ?? null)}</div>
                </div>
              </div>

              {viewModal.postType === 'feed' && (viewModal.record as FeedPost).image_url ? (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                  <img
                    src={(viewModal.record as FeedPost).image_url ?? ''}
                    alt="Draft image"
                    className="max-h-[420px] w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="px-3 py-2 text-xs text-zinc-600">Image preview</div>
                </div>
              ) : null}

              <div>
                <div className="text-xs font-medium text-zinc-600">Caption</div>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900">
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
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
              {scheduleError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{scheduleError}</div> : null}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900">Confirm Publish</h3>
              <p className="text-sm text-zinc-600">
                You’re about to publish this post to Instagram for Brand: {brandName || 'Untitled brand'}
              </p>
            </div>

            {publishNowError ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <div>{publishNowError}</div>
                {publishNowMediaErrorDetail ? <div className="mt-1 text-xs text-red-700/90">{publishNowMediaErrorDetail}</div> : null}
                {publishNowTemporaryFailure ? (
                  <div className="mt-2 text-xs text-red-700/90">Your draft is safe. Please try again.</div>
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


