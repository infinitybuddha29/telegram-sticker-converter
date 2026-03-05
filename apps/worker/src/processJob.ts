import path from 'node:path';
import { mkdir, stat, rm, readFile, writeFile } from 'node:fs/promises';
import type { JobResponse, InputInfo, EncodingStrategy } from '@sticker/core';
import {
  getInitialStrategy,
  getNextStrategy,
  checkTelegramSpec,
  buildTwoPassArgs,
  buildTwoPassArgsFromSequence,
  probeInput,
} from '@sticker/core';
import { probeWebp, extractWebpFrames } from './webpExtractor.js';
import { probeOutput } from './outputProber.js';
import { runFfmpeg } from './ffmpegRunner.js';
import { config } from './config.js';

const MAX_SIZE_BYTES = 256 * 1024;
const MAX_ATTEMPTS = 5;

// Internal job.json shape (includes _inputExt set by the API for the worker)
interface JobJson extends JobResponse {
  _inputExt?: string;
}

async function updateJobJson(jobId: string, updates: Partial<JobJson>): Promise<void> {
  const jobPath = path.join(config.dataDir, 'jobs', jobId, 'job.json');
  const raw = await readFile(jobPath, 'utf-8');
  const current = JSON.parse(raw) as JobJson;
  const updated: JobJson = { ...current, ...updates, updatedAt: new Date().toISOString() };
  await writeFile(jobPath, JSON.stringify(updated, null, 2), 'utf-8');
}

/**
 * Insert `-start_number 0` immediately after the first `-y` flag in the args array.
 * This tells the ffmpeg image2 demuxer to start numbering from frame0000.png.
 */
function addStartNumber(args: string[]): string[] {
  const yIdx = args.indexOf('-y');
  if (yIdx === -1) {
    return ['-start_number', '0', ...args];
  }
  return [
    ...args.slice(0, yIdx + 1),
    '-start_number', '0',
    ...args.slice(yIdx + 1),
  ];
}

export async function processJob(jobId: string): Promise<void> {
  const jobDir = path.join(config.dataDir, 'jobs', jobId);
  const logFile = path.join(jobDir, 'ffmpeg.log');
  let framesDir: string | null = null;

  try {
    // 1. Read job.json to get input metadata
    const jobPath = path.join(jobDir, 'job.json');
    const raw = await readFile(jobPath, 'utf-8');
    const jobJson = JSON.parse(raw) as JobJson;

    // 2. Determine input file extension
    const rawExt =
      jobJson._inputExt ??
      path.extname(jobJson.input?.filename ?? '.webp').toLowerCase();
    const inputExt: string = rawExt || '.webp';
    const inputPath = path.join(jobDir, `input${inputExt}`);
    const outputPath = path.join(jobDir, 'output.webm');

    // 3. Mark job as processing
    await updateJobJson(jobId, { status: 'processing' });

    // 4. Get input file size
    const inputStat = await stat(inputPath);
    const inputSizeBytes = inputStat.size;

    // 5. Get InputInfo based on input type
    let inputInfo: InputInfo;

    if (inputExt === '.webp') {
      // Use sharp-based probing — ffmpeg cannot read animated WebP reliably
      const webpInfo = await probeWebp(inputPath);
      inputInfo = {
        filename: jobJson.input?.filename ?? `input${inputExt}`,
        mimeType: 'image/webp',
        sizeBytes: inputSizeBytes,
        width: webpInfo.width,
        height: webpInfo.height,
        durationSec: webpInfo.durationSec,
        fps: webpInfo.fps,
        frameCount: webpInfo.frameCount,
        hasAlpha: webpInfo.hasAlpha,
      };
    } else {
      // GIF, MP4, MOV, WEBM — ffprobe can handle these directly
      const probed = await probeInput(inputPath);
      inputInfo = { ...probed, sizeBytes: inputSizeBytes };
    }

    // 6. Get initial encoding strategy
    let strategy: EncodingStrategy = getInitialStrategy(inputInfo);

    // 7. Extract frames for animated WebP (ffmpeg reads image sequence instead)
    let sequencePattern: string | null = null;
    let sequenceFps: number | null = null;

    if (inputExt === '.webp') {
      framesDir = path.join(jobDir, 'frames');
      await mkdir(framesDir, { recursive: true });
      const extracted = await extractWebpFrames(inputPath, framesDir);
      sequencePattern = extracted.pattern;
      sequenceFps = extracted.info.fps;
    }

    // 8. Encode loop — max MAX_ATTEMPTS attempts with iterative strategy reduction
    let lastOutputSize = 0;
    let success = false;
    let passLogPrefix = path.join(jobDir, `${jobId}_vpx`);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let pass1Args: string[];
      let pass2Args: string[];

      if (sequencePattern !== null && sequenceFps !== null) {
        // Image sequence input (animated WebP extracted to PNG frames)
        const seqArgs = buildTwoPassArgsFromSequence(
          strategy,
          sequencePattern,
          sequenceFps,
          outputPath,
          jobId,
          jobDir
        );
        passLogPrefix = seqArgs.passLogPrefix;
        // Add -start_number 0 so ffmpeg reads from frame0000.png
        pass1Args = addStartNumber(seqArgs.pass1);
        pass2Args = addStartNumber(seqArgs.pass2);
      } else {
        // Direct video / GIF input
        const directArgs = buildTwoPassArgs(strategy, inputPath, outputPath, jobId, jobDir);
        passLogPrefix = directArgs.passLogPrefix;
        pass1Args = directArgs.pass1;
        pass2Args = directArgs.pass2;
      }

      // Run pass 1 (analysis)
      await runFfmpeg(pass1Args, logFile, config.jobTimeoutMs);

      // Run pass 2 (encode)
      await runFfmpeg(pass2Args, logFile, config.jobTimeoutMs);

      // Check output size
      const outputStat = await stat(outputPath);
      lastOutputSize = outputStat.size;

      if (lastOutputSize <= MAX_SIZE_BYTES) {
        success = true;
        break;
      }

      // Try the next (more aggressive) encoding strategy
      const next = getNextStrategy(strategy, lastOutputSize);
      if (next === null) {
        break;
      }
      strategy = next;
    }

    // Clean up two-pass log file (best effort)
    await rm(`${passLogPrefix}-0.log`, { force: true }).catch(() => undefined);

    if (!success) {
      throw new Error(
        `Could not fit within 256KB limit after multiple attempts (last size: ${lastOutputSize} bytes)`
      );
    }

    // 9. Probe the output WebM
    const outputMeta = await probeOutput(outputPath, lastOutputSize);

    // 10. Run Telegram spec checks
    const checks = checkTelegramSpec(outputMeta);

    // 11. Clean up extracted frames directory
    if (framesDir !== null) {
      await rm(framesDir, { recursive: true, force: true }).catch(() => undefined);
      framesDir = null;
    }

    // 12. Write final status to job.json
    await updateJobJson(jobId, {
      status: 'done',
      output: outputMeta,
      checks,
      strategy,
      downloadUrl: `/api/jobs/${jobId}/download`,
    });
  } catch (err: unknown) {
    // Always clean up frames on error
    if (framesDir !== null) {
      await rm(framesDir, { recursive: true, force: true }).catch(() => undefined);
    }

    const message = err instanceof Error ? err.message : String(err);

    // Map error to a code
    let code = 'ENCODING_FAILED';
    if (message.includes('256KB limit')) {
      code = 'SIZE_LIMIT';
    } else if (message.includes('timed out')) {
      code = 'TIMEOUT';
    } else if (
      message.includes('No video stream') ||
      message.includes('ffprobe failed') ||
      message.includes('invalid JSON')
    ) {
      code = 'INVALID_INPUT';
    }

    await updateJobJson(jobId, {
      status: 'failed',
      error: { code, message },
    }).catch((updateErr: unknown) => {
      console.error(
        `Failed to update job.json for ${jobId}:`,
        updateErr instanceof Error ? updateErr.message : String(updateErr)
      );
    });

    throw err;
  }
}
