import { getBrandById } from '../brands/brand.repository';
import { getConnectedInstagramAccountByBrandId } from '../instagram/instagram-accounts.repository';
import { decryptAccessToken } from '../instagram/token.crypto';
import { getReelById, updateReelStatus, type Reel } from './reels.repository';

async function createReelsMediaContainer(args: {
  igUserId: string;
  accessToken: string;
  videoUrl: string;
  caption?: string;
}): Promise<string> {
  const version = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';
  const url = new URL(`https://graph.facebook.com/${version}/${args.igUserId}/media`);

  const body = new URLSearchParams({
    media_type: 'REELS',
    video_url: args.videoUrl,
    access_token: args.accessToken,
  });
  if (args.caption) body.set('caption', args.caption);

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) throw new Error(`Meta create reels container failed: ${resp.status}`);
  const data = (await resp.json()) as { id?: string };
  if (!data.id) throw new Error('Meta create container returned no id');
  return data.id;
}

async function publishInstagramMedia(args: {
  igUserId: string;
  accessToken: string;
  creationId: string;
}): Promise<string> {
  const version = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';
  const url = new URL(`https://graph.facebook.com/${version}/${args.igUserId}/media_publish`);
  const body = new URLSearchParams({
    creation_id: args.creationId,
    access_token: args.accessToken,
  });

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) throw new Error(`Meta publish failed: ${resp.status}`);
  const data = (await resp.json()) as { id?: string };
  if (!data.id) throw new Error('Meta publish returned no id');
  return data.id;
}

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
    const mediaContainerId = await createReelsMediaContainer({
      igUserId: igAccount.instagram_user_id,
      accessToken,
      videoUrl: reel.video_url,
    });

    const instagramMediaId = await publishInstagramMedia({
      igUserId: igAccount.instagram_user_id,
      accessToken,
      creationId: mediaContainerId,
    });

    await updateReelStatus(reelId, 'published');
    const updated = (await getReelById(reelId)) ?? reel;
    return { reel: updated, mediaContainerId, instagramMediaId };
  } catch (e) {
    await updateReelStatus(reelId, 'failed');
    throw e;
  }
}


