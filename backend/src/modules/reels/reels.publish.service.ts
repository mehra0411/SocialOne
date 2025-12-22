import { getBrandById } from '../brands/brand.repository';
import { getConnectedInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../instagram/token.crypto';
import {
  getReelById,
  claimManualRetryFailedReel,
  claimManualScheduledReel,
  markReelFailed,
  markReelPublished,
  markReelPublishing,
  markReelScheduled,
  type Reel,
} from './reels.repository';
import { getAdapter } from '../../platforms/adapterRegistry';
import type { PlatformId } from '../../platforms/types';
import { tryWritePublishAttempt } from '../audit/publishAttempts.audit';

function getMaxRetries(): number {
  const raw = process.env.SCHEDULER_MAX_RETRIES;
  if (!raw) return 3;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3;
}

export type PublishReelResult = {
  reel: Reel;
  mediaContainerId: string;
  instagramMediaId: string;
};

export async function publishReel(userId: string, reelId: string): Promise<PublishReelResult> {
  const reel = await getReelById(reelId);
  if (!reel) throw new Error('Reel not found');

  if (reel.published_at && reel.scheduled_at) throw new Error('Published posts cannot be re-scheduled');
  if (reel.status === 'publishing') throw new Error('Reel is not ready');

  // Verify brand ownership (brand → user)
  const brand = await getBrandById(reel.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  const igAccount = await getConnectedInstagramAccountByBrandId(reel.brand_id);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);
  if (!reel.video_url) throw new Error('Missing video_url');

  // Scheduled publish path: validate but do NOT publish yet.
  if (reel.scheduled_at) {
    const when = Date.parse(reel.scheduled_at);
    if (!Number.isFinite(when)) throw new Error('Invalid scheduled_at');
    if (when <= Date.now()) throw new Error('scheduled_at must be in the future');

    if (reel.status !== 'scheduled') {
      await markReelScheduled(reelId);
    }
    const updated = (await getReelById(reelId)) ?? reel;
    return { reel: updated, mediaContainerId: '', instagramMediaId: '' };
  }

  try {
    // Immediate publish path: allow 'ready' and manual retry for 'failed' reels (when a video exists).
    if (reel.status !== 'ready' && reel.status !== 'failed') throw new Error('Reel is not ready');

    const nowIso = new Date().toISOString();
    const trigger_type = reel.status === 'failed' ? 'retry' : 'manual';

    // Concurrency-safe start:
    // - ready: simple transition
    // - failed: atomic retry_count increment + publishing transition
    let working: Reel = reel;
    if (reel.status === 'ready') {
      await markReelPublishing(reelId);
      working = (await getReelById(reelId)) ?? reel;
    } else {
      const maxRetries = getMaxRetries();
      if (reel.retry_count >= maxRetries) throw new Error('Max retries exceeded');
      const claimed = await claimManualRetryFailedReel({
        reelId,
        nowIso,
        expectedRetryCount: reel.retry_count,
      });
      if (!claimed) throw new Error('Reel could not be claimed for publishing');
      working = claimed;
    }

    await tryWritePublishAttempt({
      post_id: working.id,
      post_type: 'reel',
      platform: String(working.platform),
      trigger_type,
      attempt_number: working.retry_count + 1,
      status: 'publishing',
    });

    const platform = working.platform as PlatformId;
    const adapter = getAdapter(platform);

    const result = await adapter.publish({
      platform,
      contentType: 'reel',
      brandId: working.brand_id,
      media: { kind: 'video', url: working.video_url },
      connection: {
        accountId: igAccount.instagram_user_id,
        accessToken,
      },
    });

    const mediaContainerId = result.containerId as string;
    const instagramMediaId = result.publishedId as string;

    await markReelPublished(reelId);
    await tryWritePublishAttempt({
      post_id: working.id,
      post_type: 'reel',
      platform: String(working.platform),
      trigger_type,
      attempt_number: working.retry_count + 1,
      status: 'published',
    });
    const updated = (await getReelById(reelId)) ?? reel;
    return { reel: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await markReelFailed(reelId);
    await tryWritePublishAttempt({
      post_id: reel.id,
      post_type: 'reel',
      platform: String(reel.platform),
      trigger_type: reel.status === 'failed' ? 'retry' : 'manual',
      attempt_number: reel.retry_count + 1,
      status: 'failed',
      error_message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

/**
 * INTERNAL: Manual override to force immediate publish.
 *
 * Rules:
 * - scheduled: ignore scheduled_at and publish immediately (atomic claim scheduled->publishing)
 * - failed: allow immediate retry (ignore backoff) but respect max retry limit; increment retry_count atomically
 * - published/publishing: reject
 */
export async function manualPublishReel(userId: string, reelId: string): Promise<PublishReelResult> {
  const reel = await getReelById(reelId);
  if (!reel) throw new Error('Reel not found');

  if (reel.status === 'published') throw new Error('Reel is already published');
  if (reel.status === 'publishing') throw new Error('Reel is already in progress');

  const brand = await getBrandById(reel.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  const igAccount = await getConnectedInstagramAccountByBrandId(reel.brand_id);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);
  if (!reel.video_url) throw new Error('Missing video_url');

  const nowIso = new Date().toISOString();

  let claimed: Reel | null = null;
  if (reel.status === 'scheduled') {
    claimed = await claimManualScheduledReel(reelId);
  } else if (reel.status === 'failed') {
    const maxRetries = getMaxRetries();
    if (reel.retry_count >= maxRetries) throw new Error('Max retries exceeded');
    claimed = await claimManualRetryFailedReel({
      reelId,
      nowIso,
      expectedRetryCount: reel.retry_count,
    });
  } else {
    throw new Error(`Manual publish not allowed from status: ${reel.status}`);
  }

  if (!claimed) throw new Error('Reel could not be claimed for publishing');

  try {
    const platform = claimed.platform as PlatformId;
    const adapter = getAdapter(platform);

    const result = await adapter.publish({
      platform,
      contentType: 'reel',
      brandId: claimed.brand_id,
      media: { kind: 'video', url: claimed.video_url },
      connection: {
        accountId: igAccount.instagram_user_id,
        accessToken,
      },
    });

    const mediaContainerId = result.containerId as string;
    const instagramMediaId = result.publishedId as string;

    await markReelPublished(reelId);
    const updated = (await getReelById(reelId)) ?? claimed;
    return { reel: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await markReelFailed(reelId);
    throw e;
  }
}


