import type { PlatformId } from '../../platforms/types';

export type PublishPostType = 'feed' | 'reel';
export type PublishTriggerType = 'manual' | 'scheduled' | 'retry';

export type DailyPublishMetricsRow = {
  day: string; // date (YYYY-MM-DD)
  platform: PlatformId;
  post_type: PublishPostType;
  trigger_type: PublishTriggerType;
  total_attempts: number;
  successful_publishes: number;
  failed_publishes: number;
  success_rate: number; // numeric from Postgres, will decode as number via JSON
  posts_count: number;
  avg_attempts_per_post: number;
  retries_per_post: number;
};

export type GetDailyPublishMetricsArgs = {
  /**
   * Inclusive start date (YYYY-MM-DD)
   */
  fromDay?: string;
  /**
   * Inclusive end date (YYYY-MM-DD)
   */
  toDay?: string;
  platform?: PlatformId;
  postType?: PublishPostType;
  triggerType?: PublishTriggerType;
  limit?: number; // default 100
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    serviceRoleKey,
  };
}

async function supabaseRest<T>(pathWithQuery: string): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  const resp = await fetch(`${supabaseUrl}${pathWithQuery}`, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) throw new Error(`Supabase REST error: ${resp.status}`);
  return (await resp.json()) as T;
}

/**
 * Read-only publish metrics (daily).
 *
 * Source:
 * - `public.publish_metrics_daily` view (backed by a materialized view).
 *
 * Note:
 * - The materialized view must be refreshed externally (cron/edge/etc).
 * - This repository does NOT trigger refreshes (read-only).
 */
export async function getDailyPublishMetrics(args: GetDailyPublishMetricsArgs = {}): Promise<DailyPublishMetricsRow[]> {
  const qs = new URLSearchParams();
  qs.set('select', '*');

  if (args.fromDay) qs.set('day', `gte.${args.fromDay}`);
  if (args.toDay) qs.append('day', `lte.${args.toDay}`);
  if (args.platform) qs.set('platform', `eq.${args.platform}`);
  if (args.postType) qs.set('post_type', `eq.${args.postType}`);
  if (args.triggerType) qs.set('trigger_type', `eq.${args.triggerType}`);

  qs.set('order', 'day.desc');
  qs.set('limit', String(args.limit ?? 100));

  return await supabaseRest<DailyPublishMetricsRow[]>(`/rest/v1/publish_metrics_daily?${qs.toString()}`);
}


