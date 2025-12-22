import { getBrandById } from '../brands/brand.repository';
import { getConnectedInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../instagram/token.crypto';
import { getAdapter } from '../../platforms/adapterRegistry';
import type { PlatformId } from '../../platforms/types';
import {
  getFeedPostById,
  markFeedPostFailed,
  markFeedPostPublishing,
  markFeedPostPublished,
  markFeedPostScheduled,
  claimManualRetryFailedFeedPost,
  claimManualScheduledFeedPost,
  type FeedPost,
} from './feed.repository';
import { uploadImageIfNeeded } from './uploadImageIfNeeded';

function getMaxRetries(): number {
  const raw = process.env.SCHEDULER_MAX_RETRIES;
  if (!raw) return 3;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3;
}

export type PublishFeedResult = {
  feedPost: FeedPost;
  mediaContainerId: string;
  instagramMediaId: string;
};

/**
 * Publishes an existing draft `feed_posts` row to Instagram Feed and updates status.
 *
 * Must:
 * - Accept feedPostId
 * - Fetch the draft feed post
 * - Verify brand ownership (via brand → user)
 * - Upload image (if required)
 * - Create IG media container
 * - Publish
 * - Update status to published or failed
 *
 * Must NOT:
 * - Generate or modify captions
 * - Create new feed_posts rows
 * - Bypass brand ownership checks
 * - Store Instagram tokens in plaintext (plaintext tokens are rejected)
 */
export async function publishFeedPost(userId: string, feedPostId: string): Promise<PublishFeedResult> {
  const post = await getFeedPostById(feedPostId);
  if (!post) throw new Error('Feed post not found');

  if (post.status === 'published') throw new Error('Feed post is not a draft');
  if (post.published_at && post.scheduled_at) throw new Error('Published posts cannot be re-scheduled');
  if (post.status === 'publishing') throw new Error('Feed post is already publishing');

  const brand = await getBrandById(post.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  const igAccount = await getConnectedInstagramAccountByBrandId(post.brand_id);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);

  if (!post.image_url) throw new Error('Missing image_url');
  const publicImageUrl = await uploadImageIfNeeded(post.image_url);

  // Scheduled publish path: validate but do NOT publish yet.
  if (post.scheduled_at) {
    const when = Date.parse(post.scheduled_at);
    if (!Number.isFinite(when)) throw new Error('Invalid scheduled_at');
    if (when <= Date.now()) throw new Error('scheduled_at must be in the future');

    if (post.status !== 'scheduled') {
      await markFeedPostScheduled(feedPostId);
    }
    const updated = (await getFeedPostById(feedPostId)) ?? post;
    return { feedPost: updated, mediaContainerId: '', instagramMediaId: '' };
  }

  try {
    // Immediate publish path (supports manual retry for failed posts).
    if (post.status !== 'draft' && post.status !== 'failed') {
      throw new Error('Feed post is not a draft');
    }

    await markFeedPostPublishing(feedPostId);

    const caption = post.caption ?? '';
    const platform = post.platform as PlatformId;
    const adapter = getAdapter(platform);

    const result = await adapter.publish({
      platform,
      contentType: 'feed_post',
      brandId: post.brand_id,
      media: { kind: 'image', url: publicImageUrl },
      caption: { text: caption },
      connection: {
        accountId: igAccount.instagram_user_id,
        accessToken,
      },
    });

    const mediaContainerId = result.containerId as string;
    const instagramMediaId = result.publishedId as string;

    await markFeedPostPublished(feedPostId);
    const updated = (await getFeedPostById(feedPostId)) ?? post;

    return { feedPost: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await markFeedPostFailed(feedPostId);
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
export async function manualPublishFeedPost(userId: string, feedPostId: string): Promise<PublishFeedResult> {
  const post = await getFeedPostById(feedPostId);
  if (!post) throw new Error('Feed post not found');

  if (post.status === 'published') throw new Error('Feed post is already published');
  if (post.status === 'publishing') throw new Error('Feed post is already in progress');

  // Ownership check
  const brand = await getBrandById(post.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  const igAccount = await getConnectedInstagramAccountByBrandId(post.brand_id);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);

  if (!post.image_url) throw new Error('Missing image_url');
  const publicImageUrl = await uploadImageIfNeeded(post.image_url);

  const nowIso = new Date().toISOString();

  // Atomic claim semantics (prevents duplicate publishes)
  let claimed: FeedPost | null = null;
  if (post.status === 'scheduled') {
    // ignore scheduled_at
    claimed = await claimManualScheduledFeedPost(feedPostId);
  } else if (post.status === 'failed') {
    const maxRetries = getMaxRetries();
    if (post.retry_count >= maxRetries) throw new Error('Max retries exceeded');
    claimed = await claimManualRetryFailedFeedPost({
      feedPostId,
      nowIso,
      expectedRetryCount: post.retry_count,
    });
  } else {
    throw new Error(`Manual publish not allowed from status: ${post.status}`);
  }

  if (!claimed) throw new Error('Feed post could not be claimed for publishing');

  try {
    const caption = claimed.caption ?? '';
    const platform = claimed.platform as PlatformId;
    const adapter = getAdapter(platform);

    const result = await adapter.publish({
      platform,
      contentType: 'feed_post',
      brandId: claimed.brand_id,
      media: { kind: 'image', url: publicImageUrl },
      caption: { text: caption },
      connection: {
        accountId: igAccount.instagram_user_id,
        accessToken,
      },
    });

    const mediaContainerId = result.containerId as string;
    const instagramMediaId = result.publishedId as string;

    await markFeedPostPublished(feedPostId);
    const updated = (await getFeedPostById(feedPostId)) ?? claimed;
    return { feedPost: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await markFeedPostFailed(feedPostId);
    throw e;
  }
}


