import type { PlatformId } from './types';
import type { PlatformAdapter } from './PlatformAdapter';
import { InstagramAdapter } from './instagram/InstagramAdapter';

const registry = new Map<PlatformId, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter) {
  registry.set(adapter.platform, adapter);
}

export function getAdapter(platform: PlatformId): PlatformAdapter {
  const adapter = registry.get(platform);
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}

// Register built-in adapters
registerAdapter(new InstagramAdapter());


