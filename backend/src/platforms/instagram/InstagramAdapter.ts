import type { PlatformAdapter } from '../PlatformAdapter';
import type { PublishRequest, PublishResult } from '../types';

export async function createInstagramMediaContainer(args: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<string> {
  const version = process.env.META_GRAPH_VERSION?.trim() || 'v21.0';
  const url = new URL(`https://graph.facebook.com/${version}/${args.igUserId}/media`);
  const body = new URLSearchParams({
    image_url: args.imageUrl,
    caption: args.caption,
    access_token: args.accessToken,
  });

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) throw new Error(`Meta create container failed: ${resp.status}`);
  const data = (await resp.json()) as { id?: string };
  if (!data.id) throw new Error('Meta create container returned no id');
  return data.id;
}

export async function createReelsMediaContainer(args: {
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

export async function publishInstagramMedia(args: {
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

export class InstagramAdapter implements PlatformAdapter {
  readonly platform = 'instagram' as const;

  async publish(request: PublishRequest): Promise<PublishResult> {
    const igUserId = request.connection.accountId;
    const accessToken = request.connection.accessToken;

    if (request.contentType === 'feed_post') {
      const containerId = await createInstagramMediaContainer({
        igUserId,
        accessToken,
        imageUrl: request.media.url,
        caption: request.caption?.text ?? '',
      });

      const publishedId = await publishInstagramMedia({
        igUserId,
        accessToken,
        creationId: containerId,
      });

      return { platform: this.platform, state: 'published', containerId, publishedId };
    }

    if (request.contentType === 'reel') {
      const containerId = await createReelsMediaContainer({
        igUserId,
        accessToken,
        videoUrl: request.media.url,
        caption: request.caption?.text,
      });

      const publishedId = await publishInstagramMedia({
        igUserId,
        accessToken,
        creationId: containerId,
      });

      return { platform: this.platform, state: 'published', containerId, publishedId };
    }

    return { platform: this.platform, state: 'failed' };
  }
}


