import { spawn } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { getReelById, setAiReelResult, updateReelStatus } from '../modules/reels/reels.repository';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function downloadToFile(url: string, outPath: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok || !resp.body) throw new Error(`Failed to download input: ${resp.status}`);
  await pipeline(resp.body as unknown as NodeJS.ReadableStream, createWriteStream(outPath));
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', ...args], { stdio: 'inherit' });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function uploadMp4ToSupabaseStorage(localFilePath: string): Promise<string> {
  const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = requiredEnv('SUPABASE_STORAGE_BUCKET');

  const bytes = await fs.readFile(localFilePath);
  const objectPath = `reels/${randomUUID()}.mp4`;

  const putUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
  const resp = await fetch(putUrl, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: bytes,
  });

  if (!resp.ok) throw new Error(`Storage upload failed: ${resp.status}`);

  // Public object URL (bucket must be public).
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

function buildMotionTemplateArgs(inputImagePath: string, outputMp4Path: string): string[] {
  // Simple “Ken Burns” zoom-pan template:
  // - 9:16 output at 1080x1920
  // - 20 seconds at 30 fps (600 frames)
  // - zoom slowly from 1.0 to ~1.1, centered
  //
  // This is intentionally minimal and deterministic.
  const fps = 30;
  const seconds = 20;
  const frames = fps * seconds;

  return [
    '-loop',
    '1',
    '-i',
    inputImagePath,
    '-vf',
    [
      // scale to cover
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      // zoompan over N frames
      `zoompan=z='min(zoom+0.0002,1.10)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
      `fps=${fps}`,
      'format=yuv420p',
    ].join(','),
    '-t',
    String(seconds),
    '-movflags',
    '+faststart',
    outputMp4Path,
  ];
}

/**
 * Fallback Image-to-Video worker.
 *
 * Responsibilities:
 * - Accept reelId
 * - Use FFmpeg
 * - Apply motion template
 * - Generate MP4
 *
 * Status note:
 * `reel_status` is lifecycle-only. On success we set `status='ready'` and `generation_method='fallback'`.
 */
export async function runFallbackReelWorker(reelId: string): Promise<{ videoUrl: string }> {
  if (!reelId) throw new Error('Missing reelId');

  const reel = await getReelById(reelId);
  if (!reel) throw new Error('Reel not found');

  // We need an input image URL. This is intentionally separate from `video_url`
  // to avoid overloading the final output field.
  const inputImageUrl = reel.input_image_url;
  if (!inputImageUrl) throw new Error('Missing input image URL (expected in reels.input_image_url)');
  if (!/^https?:\/\//i.test(inputImageUrl)) throw new Error('Input image must be a public http(s) URL');

  await updateReelStatus(reelId, 'generating');

  const tmpDir = await fs.mkdtemp('reel-fallback-');
  const inputPath = `${tmpDir}/input.jpg`;
  const outputPath = `${tmpDir}/output.mp4`;

  try {
    await downloadToFile(inputImageUrl, inputPath);

    const ffArgs = buildMotionTemplateArgs(inputPath, outputPath);
    await runFfmpeg(ffArgs);

    const publicVideoUrl = await uploadMp4ToSupabaseStorage(outputPath);

    await setAiReelResult({
      reelId,
      videoUrl: publicVideoUrl,
      generationMethod: 'fallback',
      status: 'ready',
    });

    return { videoUrl: publicVideoUrl };
  } catch (e) {
    await updateReelStatus(reelId, 'failed');
    throw e;
  } finally {
    // Best-effort cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}


