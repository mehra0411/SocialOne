import type { PlatformId, PublishRequest, PublishResult } from './types';

export interface PlatformAdapter {
  readonly platform: PlatformId;

  /**
   * Publish content to the platform.
   *
   * NOTE: Implementations may require access tokens / account linkage, but this
   * interface stays platform-agnostic.
   */
  publish(request: PublishRequest): Promise<PublishResult>;
}


