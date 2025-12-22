import { getBrandById } from '../brands/brand.repository';
import { getConnectedInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../instagram/token.crypto';
import { getReelById, updateReelStatus, type Reel } from './reels.repository';
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

  // Must only allow ready reels.
  if (reel.status !== 'ready') throw new Error('Reel is not ready');

  // Verify brand ownership (brand → user)
  const brand = await getBrandById(reel.brand_id, userId);
  if (!brand) throw new Error('Forbidden');

  const igAccount = await getConnectedInstagramAccountByBrandId(reel.brand_id);
  if (!igAccount) throw new Error('Instagram account not connected');
  if (!igAccount.instagram_user_id) throw new Error('Missing instagram_user_id');
  if (!igAccount.access_token_encrypted) throw new Error('Missing access_token_encrypted');

  const accessToken = decryptAccessToken(igAccount.access_token_encrypted);
  if (!reel.video_url) throw new Error('Missing video_url');

  try {
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

    await updateReelStatus(reelId, 'published');
    const updated = (await getReelById(reelId)) ?? reel;
    return { reel: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await updateReelStatus(reelId, 'failed');
    throw e;
  }
}


