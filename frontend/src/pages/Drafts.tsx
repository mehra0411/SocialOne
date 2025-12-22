import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { buttonClassName } from '../ui/button';
import { Skeleton } from '../ui/Skeleton';

type BrandOption = { id: string; name: string };

type FeedPost = {
  id: string;
  brand_id: string;
  platform: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
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
  scheduled_at: string | null;
  published_at: string | null;
  failed_at: string | null;
  retry_count: number;
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

type PostType = 'feed' | 'reel';

export function DraftsPage() {
  const [brands] = useState<BrandOption[]>(() => loadBrands());
  const [brandId, setBrandId] = useState<string>(() => loadBrands()[0]?.id ?? '');
  const [tab, setTab] = useState<PostType>('feed');

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

  const brandName = useMemo(() => brands.find((b) => b.id === brandId)?.name ?? '', [brands, brandId]);

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
          onChange={(e) => setBrandId(e.target.value)}
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
        <p className="text-xs text-zinc-500">Using the local brand selector list. (No new backend calls added.)</p>
      </div>

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
              {tab === 'feed' ? 'Feed posts' : 'Reels'} for {brandName || brandId}
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
                const actionsBusy = scheduleSubmitting || publishNowSubmitting;

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
                      <div className="flex items-center gap-2">
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
                          disabled={!canPublishNow || isPublishingOrPublished || actionsBusy}
                          onClick={() => {
                            setPublishNowError(null);
                            setPublishNowModal({ open: true, postType: tab, postId: r.id });
                          }}
                        >
                          Publish now
                        </button>
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
              <h3 className="text-base font-semibold text-zinc-900">Publish now (manual override)</h3>
              <p className="text-sm text-zinc-600">
                This will publish immediately. Scheduled posts ignore the schedule; failed posts retry right away.
              </p>
            </div>

            {publishNowError ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{publishNowError}</div>
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
                  setPublishNowError(null);
                  setPublishNowSubmitting(true);
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
                    setPublishNowModal({ open: false, postType: 'feed', postId: '' });
                  } catch (e) {
                    setPublishNowError(friendlyErrorMessage(e));
                  } finally {
                    setPublishNowSubmitting(false);
                  }
                }}
              >
                {publishNowSubmitting ? 'Publishing…' : 'Confirm publish now'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


