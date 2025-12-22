import { getAdapter } from '../platforms/adapterRegistry';
import type { PlatformId } from '../platforms/types';
import { getConnectedInstagramAccountByBrandId } from '../modules/instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../modules/instagram/token.crypto';
import {
  claimRetryFailedFeedPost,
  claimDueScheduledFeedPost,
  listDueScheduledFeedPosts,
  listFailedFeedPostsForRetry,
  markFeedPostFailed,
  markFeedPostPublished,
  type FeedPost,
} from '../modules/feed/feed.repository';
import { uploadImageIfNeeded } from '../modules/feed/uploadImageIfNeeded';
import {
  claimRetryFailedReel,
  claimDueScheduledReel,
  listDueScheduledReels,
  listFailedReelsForRetry,
  markReelFailed,
  markReelPublished,
  type Reel,
} from '../modules/reels/reels.repository';

export type RunScheduledPublishesOptions = {
  /**
   * Max number of scheduled items to process in this run (across feed + reels).
   */
  limit?: number;
};

export type RunScheduledPublishesResult = {
  attempted: number;
  published: number;
  failed: number;
  skipped: number;
};

function logEvent(event: Record<string, unknown>) {
  // Simple deterministic logging (no external service).
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(event));
}

function getMaxRetries(): number {
  const raw = process.env.SCHEDULER_MAX_RETRIES;
  if (!raw) return 3;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3;
}

/**
 * Retry backoff policy (documented):
 * Exponential backoff in seconds: 60 * 2^(retry_count)
 * - retry_count is the number of previous attempts (0 for first failure)
 * - This yields: 60s, 120s, 240s, ...
 */
function backoffSeconds(retryCount: number): number {
  const base = 60;
  const exp = Math.max(0, Math.min(10, retryCount)); // cap growth to keep it bounded/deterministic
  return base * 2 ** exp;
}

function isRetryDue(nowMs: number, lastRetryAtIso: string | null, retryCount: number): boolean {
  if (!lastRetryAtIso) return true;
  const last = Date.parse(lastRetryAtIso);
  if (!Number.isFinite(last)) return true;
  const dueAt = last + backoffSeconds(retryCount) * 1000;
  return nowMs >= dueAt;
}

async function resolveConnection(platform: PlatformId, brandId: string): Promise<{ accountId: string; accessToken: string }> {
  // Single-platform system today; keep it explicit and deterministic.
  if (platform !== 'instagram') throw new Error(`Unsupported platform: ${platform}`);

  const igAccount = await getConnectedInstagramAccountByBrandId(brandId);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);
  return { accountId: igAccount.instagram_user_id, accessToken };
}

async function publishScheduledFeedPost(post: FeedPost): Promise<{ containerId: string; publishedId: string }> {
  const platform = post.platform as PlatformId;
  const adapter = getAdapter(platform);

  if (!post.image_url) throw new Error('Missing image_url');
  const publicImageUrl = await uploadImageIfNeeded(post.image_url);

  const connection = await resolveConnection(platform, post.brand_id);

  const result = await adapter.publish({
    platform,
    contentType: 'feed_post',
    brandId: post.brand_id,
    media: { kind: 'image', url: publicImageUrl },
    caption: { text: post.caption ?? '' },
    connection,
  });

  return {
    containerId: result.containerId as string,
    publishedId: result.publishedId as string,
  };
}

async function publishScheduledReel(reel: Reel): Promise<{ containerId: string; publishedId: string }> {
  const platform = reel.platform as PlatformId;
  const adapter = getAdapter(platform);

  if (!reel.video_url) throw new Error('Missing video_url');
  const connection = await resolveConnection(platform, reel.brand_id);

  const result = await adapter.publish({
    platform,
    contentType: 'reel',
    brandId: reel.brand_id,
    media: { kind: 'video', url: reel.video_url },
    connection,
  });

  return {
    containerId: result.containerId as string,
    publishedId: result.publishedId as string,
  };
}

/**
 * Minimal scheduler execution engine.
 * Callable on-demand (no cron/queue yet).
 */
export async function runScheduledPublishes(
  options: RunScheduledPublishesOptions = {},
): Promise<RunScheduledPublishesResult> {
  const limit = options.limit ?? 10;
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const maxRetries = getMaxRetries();

  const result: RunScheduledPublishesResult = { attempted: 0, published: 0, failed: 0, skipped: 0 };

  // Process feed_posts first, then reels, capped by the remaining limit.
  const dueFeed = await listDueScheduledFeedPosts(limit, nowIso);
  for (const row of dueFeed) {
    if (result.attempted >= limit) break;

    const claimed = await claimDueScheduledFeedPost(row.id, nowIso);
    if (!claimed) {
      result.skipped += 1;
      continue;
    }

    result.attempted += 1;

    try {
      const ids = await publishScheduledFeedPost(claimed);
      await markFeedPostPublished(claimed.id);
      result.published += 1;
      logEvent({
        type: 'feed_post',
        postId: claimed.id,
        platform: claimed.platform,
        result: 'published',
        containerId: ids.containerId,
        publishedId: ids.publishedId,
      });
    } catch (e) {
      await markFeedPostFailed(claimed.id);
      result.failed += 1;
      logEvent({
        type: 'feed_post',
        postId: claimed.id,
        platform: claimed.platform,
        result: 'failed',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Retry-eligible failed feed posts (bounded by remaining limit).
  let remaining = limit - result.attempted;
  if (remaining > 0 && maxRetries > 0) {
    const failedFeed = await listFailedFeedPostsForRetry(remaining, maxRetries);
    for (const row of failedFeed) {
      if (result.attempted >= limit) break;
      if (!isRetryDue(nowMs, row.last_retry_at, row.retry_count)) continue;

      const claimed = await claimRetryFailedFeedPost({
        feedPostId: row.id,
        nowIso,
        expectedRetryCount: row.retry_count,
        expectedLastRetryAt: row.last_retry_at,
      });
      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      result.attempted += 1;

      try {
        const ids = await publishScheduledFeedPost(claimed);
        await markFeedPostPublished(claimed.id);
        result.published += 1;
        logEvent({
          type: 'feed_post',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'published',
          retry: true,
          retryCount: claimed.retry_count,
          containerId: ids.containerId,
          publishedId: ids.publishedId,
        });
      } catch (e) {
        await markFeedPostFailed(claimed.id);
        result.failed += 1;
        logEvent({
          type: 'feed_post',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'failed',
          retry: true,
          retryCount: claimed.retry_count,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  remaining = limit - result.attempted;
  if (remaining > 0) {
    const dueReels = await listDueScheduledReels(remaining, nowIso);
    for (const row of dueReels) {
      if (result.attempted >= limit) break;

      const claimed = await claimDueScheduledReel(row.id, nowIso);
      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      result.attempted += 1;

      try {
        const ids = await publishScheduledReel(claimed);
        await markReelPublished(claimed.id);
        result.published += 1;
        logEvent({
          type: 'reel',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'published',
          containerId: ids.containerId,
          publishedId: ids.publishedId,
        });
      } catch (e) {
        await markReelFailed(claimed.id);
        result.failed += 1;
        logEvent({
          type: 'reel',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'failed',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // Retry-eligible failed reels (bounded by remaining limit).
  remaining = limit - result.attempted;
  if (remaining > 0 && maxRetries > 0) {
    const failedReels = await listFailedReelsForRetry(remaining, maxRetries);
    for (const row of failedReels) {
      if (result.attempted >= limit) break;
      if (!isRetryDue(nowMs, row.last_retry_at, row.retry_count)) continue;

      const claimed = await claimRetryFailedReel({
        reelId: row.id,
        nowIso,
        expectedRetryCount: row.retry_count,
        expectedLastRetryAt: row.last_retry_at,
      });
      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      result.attempted += 1;

      try {
        const ids = await publishScheduledReel(claimed);
        await markReelPublished(claimed.id);
        result.published += 1;
        logEvent({
          type: 'reel',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'published',
          retry: true,
          retryCount: claimed.retry_count,
          containerId: ids.containerId,
          publishedId: ids.publishedId,
        });
      } catch (e) {
        await markReelFailed(claimed.id);
        result.failed += 1;
        logEvent({
          type: 'reel',
          postId: claimed.id,
          platform: claimed.platform,
          result: 'failed',
          retry: true,
          retryCount: claimed.retry_count,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return result;
}


