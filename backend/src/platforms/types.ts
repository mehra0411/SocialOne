export type PlatformId = 'instagram';

export type ContentType = 'feed_post' | 'reel';

export type PlatformPublishState = 'draft' | 'processing' | 'published' | 'failed';

export type PlatformMediaKind = 'image' | 'video';

export type PlatformMediaInput = {
  kind: PlatformMediaKind;
  /**
   * Must be publicly accessible by the platform (e.g., Meta Graph).
   */
  url: string;
};

export type PlatformCaption = {
  text: string;
};

export type PlatformConnection = {
  /**
   * Platform account identifier (e.g., Instagram User ID for Meta Graph).
   */
  accountId: string;
  /**
   * Platform access token used for publish actions.
   */
  accessToken: string;
};

export type PublishRequest = {
  platform: PlatformId;
  contentType: ContentType;
  brandId: string;
  media: PlatformMediaInput;
  caption?: PlatformCaption;
  connection: PlatformConnection;
};

export type PublishResult = {
  platform: PlatformId;
  state: PlatformPublishState;
  /**
   * Platform-side identifier for created media/container (if any).
   */
  containerId?: string;
  /**
   * Platform-side identifier for the final published post/media.
   */
  publishedId?: string;
};


