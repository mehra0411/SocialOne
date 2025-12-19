export async function generateReelDraft(
  userId: string,
  payload: {
    brandId: string;
    input_image_url: string;
  }
) {
  if (!userId) throw new Error('Missing userId');
  if (!payload.brandId) throw new Error('Missing brandId');

  // TEMP stub — implement AI / video later
  return {
    id: 'temp-reel-id',
    status: 'draft',
    ...payload,
  };
}

export async function publishReel(
  userId: string,
  reelId: string
) {
  if (!userId) throw new Error('Missing userId');
  if (!reelId) throw new Error('Missing reelId');

  // TEMP stub
  return {
    success: true,
  };
}
