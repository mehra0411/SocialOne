-- Daily publish metrics derived from `publish_attempts`.
-- NOTE: Materialized view is used to avoid re-scanning `publish_attempts` repeatedly for dashboards.
-- Refresh is external (cron/edge/etc) and is intentionally not included here.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'publish_metrics_daily_mv'
  ) THEN
    CREATE MATERIALIZED VIEW public.publish_metrics_daily_mv AS
    WITH per_post AS (
      SELECT
        date_trunc('day', created_at)::date AS day,
        platform,
        post_type,
        trigger_type,
        post_id,
        COUNT(*)::int AS attempts,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)::int AS successes,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failures
      FROM public.publish_attempts
      GROUP BY 1,2,3,4,5
    )
    SELECT
      day,
      platform,
      post_type,
      trigger_type,
      SUM(attempts)::int AS total_attempts,
      SUM(successes)::int AS successful_publishes,
      SUM(failures)::int AS failed_publishes,
      CASE
        WHEN SUM(attempts) = 0 THEN 0
        ELSE (SUM(successes)::numeric / SUM(attempts)::numeric)
      END AS success_rate,
      COUNT(*)::int AS posts_count,
      AVG(attempts)::numeric AS avg_attempts_per_post,
      AVG(GREATEST(attempts - 1, 0))::numeric AS retries_per_post
    FROM per_post
    GROUP BY 1,2,3,4;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS publish_metrics_daily_mv_idx
ON public.publish_metrics_daily_mv (day, platform, post_type, trigger_type);

-- Convenience view (read-only) that points at the materialized view.
CREATE OR REPLACE VIEW public.publish_metrics_daily AS
SELECT *
FROM public.publish_metrics_daily_mv;


