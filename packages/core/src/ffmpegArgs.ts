import type { EncodingStrategy } from './types.js';

export interface TwoPassArgs {
  pass1: string[];
  pass2: string[];
  passLogPrefix: string;  // path prefix for pass log files
}

function buildCommonEncodeArgs(strategy: EncodingStrategy): string[] {
  const scaleFilter = strategy.sourceWidth >= strategy.sourceHeight
    ? `scale=${strategy.scaleMax}:-2:force_original_aspect_ratio=decrease`
    : `scale=-2:${strategy.scaleMax}:force_original_aspect_ratio=decrease`;

  const filterChain = `fps=${strategy.fps},${scaleFilter}`;
  const pixFmt = strategy.hasAlpha ? 'yuva420p' : 'yuv420p';

  return [
    '-vf', filterChain,
    '-pix_fmt', pixFmt,
    '-c:v', 'libvpx-vp9',
    '-b:v', `${strategy.bitrate}k`,
    '-minrate', `${Math.floor(strategy.bitrate * 0.5)}k`,
    '-maxrate', `${Math.floor(strategy.bitrate * 1.5)}k`,
    '-crf', String(strategy.crf),
    ...(strategy.hasAlpha ? ['-auto-alt-ref', '0'] : []),
    '-deadline', 'good',
    '-cpu-used', '2',
    '-an',
  ];
}

/** For direct video/GIF input (ffmpeg reads the container directly). */
export function buildTwoPassArgs(
  strategy: EncodingStrategy,
  inputPath: string,
  outputPath: string,
  jobId: string,
  tmpDir: string
): TwoPassArgs {
  const passLogPrefix = `${tmpDir}/${jobId}_vpx`;
  const encodeArgs = buildCommonEncodeArgs(strategy);

  const pass1: string[] = [
    '-y', '-i', inputPath,
    '-t', '3',
    ...encodeArgs,
    '-pass', '1',
    '-passlogfile', passLogPrefix,
    '-f', 'null', '/dev/null',
  ];

  const pass2: string[] = [
    '-y', '-i', inputPath,
    '-t', '3',
    ...encodeArgs,
    '-pass', '2',
    '-passlogfile', passLogPrefix,
    outputPath,
  ];

  return { pass1, pass2, passLogPrefix };
}

/**
 * For PNG image sequence input (used after extracting animated WebP frames via sharp).
 * `sequencePattern` is a glob-style path like `/tmp/jobId/frame%04d.png`
 * `sourceFps` is the original animation frame rate
 */
export function buildTwoPassArgsFromSequence(
  strategy: EncodingStrategy,
  sequencePattern: string,
  sourceFps: number,
  outputPath: string,
  jobId: string,
  tmpDir: string
): TwoPassArgs {
  const passLogPrefix = `${tmpDir}/${jobId}_vpx`;
  const encodeArgs = buildCommonEncodeArgs(strategy);

  // image2 demuxer: -f image2 -framerate {fps} -i {pattern}
  const inputArgs = ['-f', 'image2', '-framerate', String(sourceFps), '-i', sequencePattern];

  const pass1: string[] = [
    '-y', ...inputArgs,
    '-t', '3',
    ...encodeArgs,
    '-pass', '1',
    '-passlogfile', passLogPrefix,
    '-f', 'null', '/dev/null',
  ];

  const pass2: string[] = [
    '-y', ...inputArgs,
    '-t', '3',
    ...encodeArgs,
    '-pass', '2',
    '-passlogfile', passLogPrefix,
    outputPath,
  ];

  return { pass1, pass2, passLogPrefix };
}
