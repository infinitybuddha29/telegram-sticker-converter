import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { InputInfo, OutputMeta } from './types.js';

const execFileAsync = promisify(execFile);

// --- Pure parsing helpers (exported for unit testing) ---

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_frames?: string;
  pix_fmt?: string;
}

interface FfprobeFormat {
  duration?: string;
  format_name?: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: FfprobeFormat;
}

/**
 * Parse a frame rate string like "30/1" or "25/1" or "0/0".
 * Returns the numeric fps, or NaN/Infinity if invalid.
 */
export function parseFrameRate(rateStr: string | undefined): number {
  if (!rateStr) return NaN;
  const parts = rateStr.split('/');
  if (parts.length !== 2) return NaN;
  const num = parseFloat(parts[0] ?? '0');
  const den = parseFloat(parts[1] ?? '0');
  if (den === 0) return NaN;
  return num / den;
}

/**
 * Determine FPS from a video stream and format info.
 * Falls back to nb_frames/duration if frame rate strings are invalid.
 * Defaults to 24 if everything fails.
 */
export function parseFps(stream: FfprobeStream, format: FfprobeFormat): number {
  // Try r_frame_rate first, then avg_frame_rate
  let fps = parseFrameRate(stream.r_frame_rate);
  if (!isFinite(fps) || fps === 0 || isNaN(fps)) {
    fps = parseFrameRate(stream.avg_frame_rate);
  }

  if (!isFinite(fps) || fps === 0 || isNaN(fps)) {
    // Fallback: nb_frames / duration
    const nbFrames = parseInt(stream.nb_frames ?? '', 10);
    const durationStr = stream.duration ?? format.duration;
    const duration = durationStr ? parseFloat(durationStr) : 0;
    if (nbFrames > 0 && duration > 0) {
      fps = nbFrames / duration;
    } else {
      fps = 24; // default
    }
  }

  // Clamp to [1, 30]
  fps = Math.max(1, Math.min(30, fps));
  return fps;
}

/**
 * Determine if a video stream has an alpha channel based on pix_fmt.
 */
export function detectAlpha(pixFmt: string | undefined): boolean {
  if (!pixFmt) return false;
  const alphaFormats = ['yuva420p', 'rgba', 'ya8', 'bgra', 'argb'];
  return alphaFormats.includes(pixFmt);
}

/**
 * Parse duration from stream or format, returning 0 as default.
 */
export function parseDuration(stream: FfprobeStream, format: FfprobeFormat): number {
  const streamDur = stream.duration ? parseFloat(stream.duration) : NaN;
  if (!isNaN(streamDur) && streamDur > 0) return streamDur;
  const formatDur = format.duration ? parseFloat(format.duration) : NaN;
  if (!isNaN(formatDur) && formatDur > 0) return formatDur;
  return 0;
}

// --- Main async functions ---

async function runFfprobe(filePath: string): Promise<FfprobeOutput> {
  let stdout: string;
  try {
    const result = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      filePath,
    ]);
    stdout = result.stdout;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`ffprobe failed for "${filePath}": ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`ffprobe returned invalid JSON for "${filePath}"`);
  }

  if (
    typeof parsed !== 'object' || parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>)['streams'])
  ) {
    throw new Error(`ffprobe output missing streams for "${filePath}"`);
  }

  return parsed as FfprobeOutput;
}

export async function probeInput(filePath: string): Promise<InputInfo> {
  const data = await runFfprobe(filePath);
  const streams: FfprobeStream[] = data.streams;
  const format: FfprobeFormat = data.format;

  const videoStream = streams.find(s => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error(`No video stream found in "${filePath}"`);
  }

  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  const durationSec = parseDuration(videoStream, format);
  const fps = parseFps(videoStream, format);
  const frameCount = videoStream.nb_frames ? parseInt(videoStream.nb_frames, 10) : 0;
  const hasAlpha = detectAlpha(videoStream.pix_fmt);

  return {
    filename: filePath.split('/').pop() ?? filePath,
    mimeType: 'image/webp',
    sizeBytes: 0, // caller should provide actual file size
    width,
    height,
    durationSec,
    fps,
    frameCount,
    hasAlpha,
  };
}

export async function probeOutput(filePath: string): Promise<OutputMeta> {
  const data = await runFfprobe(filePath);
  const streams: FfprobeStream[] = data.streams;
  const format: FfprobeFormat = data.format;

  const videoStream = streams.find(s => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error(`No video stream found in "${filePath}"`);
  }

  const hasAudio = streams.some(s => s.codec_type === 'audio');

  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  const durationSec = parseDuration(videoStream, format);
  const fps = parseFps(videoStream, format);
  const hasAlpha = detectAlpha(videoStream.pix_fmt);
  const codec = videoStream.codec_name ?? '';
  const pixFmt = videoStream.pix_fmt ?? '';
  const container = (format.format_name ?? '').includes('webm') ? 'webm' : (format.format_name ?? '');

  return {
    codec,
    container,
    width,
    height,
    durationSec,
    fps,
    hasAudio,
    fileSizeBytes: 0, // caller should provide actual file size
    hasAlpha,
    pixFmt,
  };
}
