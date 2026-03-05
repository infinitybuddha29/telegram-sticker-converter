import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface WebpInfo {
  width: number;
  height: number;
  frameCount: number;
  durationMs: number;    // total animation duration in ms
  durationSec: number;
  fps: number;
  hasAlpha: boolean;
}

export interface ExtractedFrames {
  info: WebpInfo;
  framesDir: string;
  pattern: string;  // e.g. "/tmp/jobId/frames/frame%04d.png"
}

/** Probe an animated WebP file to get metadata. */
export async function probeWebp(filePath: string): Promise<WebpInfo> {
  const meta = await sharp(filePath, { animated: true }).metadata();

  const width = meta.width ?? 0;
  const frameCount = meta.pages ?? 1;
  // For animated images, sharp stacks all frames vertically.
  // pageHeight is the height of a single frame; fall back to height/pages.
  const height = meta.pageHeight ?? Math.round((meta.height ?? 0) / Math.max(frameCount, 1));

  // delay is an array of per-frame delays in ms, or undefined
  const delays: number[] = Array.isArray(meta.delay) ? meta.delay : [];
  let avgDelayMs: number;
  if (delays.length > 0) {
    const total = delays.reduce((sum, d) => sum + d, 0);
    avgDelayMs = total / delays.length;
  } else {
    // Default: assume ~40ms per frame (25fps)
    avgDelayMs = 40;
  }

  // Clamp fps to [1, 60]
  const rawFps = 1000 / avgDelayMs;
  const fps = Math.max(1, Math.min(60, rawFps));

  const durationMs = frameCount * avgDelayMs;
  const durationSec = durationMs / 1000;

  const hasAlpha = meta.hasAlpha ?? false;

  return {
    width,
    height,
    frameCount,
    durationMs,
    durationSec,
    fps,
    hasAlpha,
  };
}

/** Extract all frames from animated WebP to PNG files in framesDir. Returns ExtractedFrames. */
export async function extractWebpFrames(filePath: string, framesDir: string): Promise<ExtractedFrames> {
  const info = await probeWebp(filePath);
  const { frameCount } = info;

  for (let i = 0; i < frameCount; i++) {
    const frameBuffer = await sharp(filePath, { page: i }).png().toBuffer();
    const frameName = `frame${String(i).padStart(4, '0')}.png`;
    const framePath = path.join(framesDir, frameName);
    await writeFile(framePath, frameBuffer);
  }

  const pattern = path.join(framesDir, 'frame%04d.png');

  return {
    info,
    framesDir,
    pattern,
  };
}
