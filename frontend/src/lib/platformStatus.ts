import { apiFetch } from './api';

export type InstagramPlatformStatus = {
  platform: 'instagram';
  connected: boolean;
  accountName: string | null;
  expiresAt: string | null;
};

export async function fetchInstagramPlatformStatus(brandId: string): Promise<InstagramPlatformStatus> {
  return await apiFetch<InstagramPlatformStatus>(`/api/brands/${brandId}/platforms`);
}


