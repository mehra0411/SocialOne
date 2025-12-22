import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { buttonClassName } from '../ui/button';
import { Skeleton } from '../ui/Skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Row = {
  day: string; // YYYY-MM-DD
  platform: string;
  post_type: 'feed' | 'reel';
  trigger_type: 'manual' | 'scheduled' | 'retry';
  total_attempts: number;
  successful_publishes: number;
  failed_publishes: number;
  success_rate: number;
  posts_count: number;
  avg_attempts_per_post: number;
  retries_per_post: number;
};

type Filters = {
  fromDay: string;
  toDay: string;
  platform: '' | string;
  postType: '' | Row['post_type'];
  triggerType: '' | Row['trigger_type'];
};

function formatPct(x: number): string {
  if (!Number.isFinite(x)) return '-';
  return `${(x * 100).toFixed(1)}%`;
}

function fmtInt(x: number): string {
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString();
}

function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('jwt') || lower.includes('unauthorized')) return 'Your session has expired. Please log in again.';
  if (lower.includes('forbidden') || lower.includes('permission')) {
    return 'You do not have permission to view metrics. Please contact an admin.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network issue—please check your connection and try again.';
  }
  return 'We couldn’t load metrics right now. Please try again.';
}

export function AdminMetricsPage() {
  const [filters, setFilters] = useState<Filters>(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { fromDay: from, toDay: to, platform: '', postType: '', triggerType: '' };
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.platform);
    return Array.from(set).sort();
  }, [rows]);

  async function fetchMetrics() {
    setError(null);
    setLoading(true);
    try {
      let q = supabase.from('publish_metrics_daily').select('*');

      if (filters.fromDay) q = q.gte('day', filters.fromDay);
      if (filters.toDay) q = q.lte('day', filters.toDay);
      if (filters.platform) q = q.eq('platform', filters.platform);
      if (filters.postType) q = q.eq('post_type', filters.postType);
      if (filters.triggerType) q = q.eq('trigger_type', filters.triggerType);

      q = q.order('day', { ascending: true }).limit(1000);

      const { data, error } = await q;
      if (error) throw error;

      // Supabase returns numeric as string sometimes; normalize.
      const normalized = (data ?? []).map((d: any) => ({
        ...d,
        total_attempts: Number(d.total_attempts ?? 0),
        successful_publishes: Number(d.successful_publishes ?? 0),
        failed_publishes: Number(d.failed_publishes ?? 0),
        success_rate: Number(d.success_rate ?? 0),
        posts_count: Number(d.posts_count ?? 0),
        avg_attempts_per_post: Number(d.avg_attempts_per_post ?? 0),
        retries_per_post: Number(d.retries_per_post ?? 0),
      })) as Row[];

      setRows(normalized);
    } catch (e) {
      setError(friendlyErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overview = useMemo(() => {
    const totalAttempts = rows.reduce((a, r) => a + r.total_attempts, 0);
    const successes = rows.reduce((a, r) => a + r.successful_publishes, 0);
    const failures = rows.reduce((a, r) => a + r.failed_publishes, 0);

    const postsCount = rows.reduce((a, r) => a + r.posts_count, 0);
    const avgAttempts =
      postsCount > 0
        ? rows.reduce((a, r) => a + r.avg_attempts_per_post * r.posts_count, 0) / postsCount
        : 0;

    const successRate = totalAttempts > 0 ? successes / totalAttempts : 0;

    return { totalAttempts, successes, failures, successRate, avgAttempts };
  }, [rows]);

  const dailySeries = useMemo(() => {
    const byDay = new Map<string, { day: string; attempts: number; success: number; failed: number }>();
    for (const r of rows) {
      const v = byDay.get(r.day) ?? { day: r.day, attempts: 0, success: 0, failed: 0 };
      v.attempts += r.total_attempts;
      v.success += r.successful_publishes;
      v.failed += r.failed_publishes;
      byDay.set(r.day, v);
    }
    return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900">Admin Metrics</h1>
          <p className="text-sm text-zinc-600">Read-only publish metrics from `publish_metrics_daily`.</p>
        </div>

        <button className={buttonClassName({ variant: 'secondary' })} onClick={() => void fetchMetrics()} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Filters</h2>
            <p className="text-sm text-zinc-600">Filter by date range and dimensions.</p>
          </div>
          <div className="text-xs text-zinc-500">{loading ? 'Loading…' : `${rows.length} rows`}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-900">From</span>
            <input
              type="date"
              className="rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
              value={filters.fromDay}
              onChange={(e) => setFilters((p) => ({ ...p, fromDay: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-900">To</span>
            <input
              type="date"
              className="rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
              value={filters.toDay}
              onChange={(e) => setFilters((p) => ({ ...p, toDay: e.target.value }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-900">Platform</span>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
              value={filters.platform}
              onChange={(e) => setFilters((p) => ({ ...p, platform: e.target.value }))}
            >
              <option value="">All</option>
              {(platformOptions.length ? platformOptions : ['instagram']).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-900">Post type</span>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
              value={filters.postType}
              onChange={(e) => setFilters((p) => ({ ...p, postType: e.target.value as any }))}
            >
              <option value="">All</option>
              <option value="feed">feed</option>
              <option value="reel">reel</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-900">Trigger</span>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2"
              value={filters.triggerType}
              onChange={(e) => setFilters((p) => ({ ...p, triggerType: e.target.value as any }))}
            >
              <option value="">All</option>
              <option value="manual">manual</option>
              <option value="scheduled">scheduled</option>
              <option value="retry">retry</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button className={buttonClassName({ variant: 'primary' })} onClick={() => void fetchMetrics()} disabled={loading}>
            Apply filters
          </button>
          <button
            className={buttonClassName({ variant: 'secondary' })}
            onClick={() => {
              const now = new Date();
              const to = now.toISOString().slice(0, 10);
              const from = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
              setFilters({ fromDay: from, toDay: to, platform: '', postType: '', triggerType: '' });
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {error ? (
        <div className="flex">
          <button className={buttonClassName({ variant: 'secondary' })} onClick={() => void fetchMetrics()} disabled={loading}>
            Retry
          </button>
        </div>
      ) : null}

      {/* Overview cards */}
      <section className="grid gap-3 md:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`card-sk-${i}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-600">Total attempts</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">{fmtInt(overview.totalAttempts)}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-600">Successful publishes</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">{fmtInt(overview.successes)}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-600">Failed publishes</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">{fmtInt(overview.failures)}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-600">Success rate</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">{formatPct(overview.successRate)}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-medium text-zinc-600">Avg attempts / post</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">
                {Number.isFinite(overview.avgAttempts) ? overview.avgAttempts.toFixed(2) : '-'}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Charts */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Daily attempts</h2>
          <p className="text-sm text-zinc-600">Total attempts per day.</p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="h-full space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : dailySeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="attempts" stroke="#4F46E5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                No data for the selected filters/date range. Try expanding the date range or clearing filters.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Success vs failure</h2>
          <p className="text-sm text-zinc-600">Stacked counts per day.</p>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="h-full space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : dailySeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" stackId="a" fill="#4F46E5" name="success" />
                  <Bar dataKey="failed" stackId="a" fill="#E11D48" name="failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                No data for the selected filters/date range. Try expanding the date range or clearing filters.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Daily breakdown</h2>
            <p className="text-sm text-zinc-600">By day, platform, post_type, trigger_type.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <th className="py-2 pr-4">Day</th>
                <th className="py-2 pr-4">Platform</th>
                <th className="py-2 pr-4">Post type</th>
                <th className="py-2 pr-4">Trigger</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2 pr-4">Success</th>
                <th className="py-2 pr-4">Failed</th>
                <th className="py-2 pr-4">Success rate</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`tbl-sk-${i}`} className="border-b border-zinc-100">
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-14" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                : rows.map((r) => (
                    <tr key={`${r.day}-${r.platform}-${r.post_type}-${r.trigger_type}`} className="border-b border-zinc-100">
                      <td className="py-3 pr-4 text-zinc-700">{r.day}</td>
                      <td className="py-3 pr-4 text-zinc-700">{r.platform}</td>
                      <td className="py-3 pr-4 text-zinc-700">{r.post_type}</td>
                      <td className="py-3 pr-4 text-zinc-700">{r.trigger_type}</td>
                      <td className="py-3 pr-4 text-zinc-700">{fmtInt(r.total_attempts)}</td>
                      <td className="py-3 pr-4 text-zinc-700">{fmtInt(r.successful_publishes)}</td>
                      <td className="py-3 pr-4 text-zinc-700">{fmtInt(r.failed_publishes)}</td>
                      <td className="py-3 pr-4 text-zinc-700">{formatPct(r.success_rate)}</td>
                    </tr>
                  ))}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-zinc-600" colSpan={8}>
                    <div className="space-y-1">
                      <div className="font-medium text-zinc-900">No data for this selection</div>
                      <div>No publish attempts were recorded for the chosen date range/filters.</div>
                      <div className="text-zinc-600">
                        Next: try expanding the date range or clearing filters.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


