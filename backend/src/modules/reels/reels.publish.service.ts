import { getBrandById } from '../brands/brand.repository';
import { getConnectedInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../instagram/token.crypto';
import {
  getReelById,
  markReelFailed,
  markReelPublished,
  markReelPublishing,
  markReelScheduled,
  type Reel,
} from './reels.repository';
import { getAdapter } from '../../platforms/adapterRegistry';
import type { PlatformId } from '../../platforms/types';

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

    await markReelPublishing(reelId);

    const platform = reel.platform as PlatformId;
    const adapter = getAdapter(platform);

    const result = await adapter.publish({
      platform,
      contentType: 'reel',
      brandId: reel.brand_id,
      media: { kind: 'video', url: reel.video_url },
      connection: {
        accountId: igAccount.instagram_user_id,
        accessToken,
      },
    });

    const mediaContainerId = result.containerId as string;
    const instagramMediaId = result.publishedId as string;

    await markReelPublished(reelId);
    const updated = (await getReelById(reelId)) ?? reel;
    return { reel: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await markReelFailed(reelId);
    throw e;
  }
}


