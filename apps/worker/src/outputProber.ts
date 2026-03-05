import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { OutputMeta } from '@sticker/core';

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
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

function parseFrameRate(rateStr: string | undefined): number {
  if (!rateStr) return NaN;
  const parts = rateStr.split('/');
  if (parts.length !== 2) return NaN;
  const num = parseFloat(parts[0] ?? '0');
  const den = parseFloat(parts[1] ?? '0');
  if (den === 0) return NaN;
  return num / den;
}

function parseFps(stream: FfprobeStream): number {
  let fps = parseFrameRate(stream.avg_frame_rate);
  if (!isFinite(fps) || fps === 0 || isNaN(fps)) {
    fps = parseFrameRate(stream.r_frame_rate);
  }
  if (!isFinite(fps) || fps === 0 || isNaN(fps)) {
    fps = 0;
  }
  return fps;
}

function parseDuration(stream: FfprobeStream, format: FfprobeFormat): number {
  const streamDur = stream.duration ? parseFloat(stream.duration) : NaN;
  if (!isNaN(streamDur) && streamDur > 0) return streamDur;
  const formatDur = format.duration ? parseFloat(format.duration) : NaN;
  if (!isNaN(formatDur) && formatDur > 0) return formatDur;
  return 0;
}

export async function probeOutput(filePath: string, fileSizeBytes: number): Promise<OutputMeta> {
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

  const data = parsed as FfprobeOutput;
  const streams: FfprobeStream[] = data.streams ?? [];
  const format: FfprobeFormat = data.format ?? {};

  const videoStream = streams.find(s => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error(`No video stream found in "${filePath}"`);
  }

  const hasAudio = streams.some(s => s.codec_type === 'audio');
  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  const durationSec = parseDuration(videoStream, format);
  const fps = parseFps(videoStream);
  const codec = videoStream.codec_name ?? '';
  const pixFmt = videoStream.pix_fmt ?? '';
  const hasAlpha = pixFmt.includes('a');  // e.g. yuva420p contains 'a'
  const container = (format.format_name ?? '').includes('webm') ? 'webm' : (format.format_name ?? '');

  return {
    codec,
    container,
    width,
    height,
    durationSec,
    fps,
    hasAudio,
    fileSizeBytes,
    hasAlpha,
    pixFmt,
  };
}
