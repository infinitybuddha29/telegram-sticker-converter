/**
 * Integration tests for processJob — runs real ffmpeg + sharp pipeline.
 * Requires: ffmpeg installed at /opt/homebrew/bin/ffmpeg (macOS via Homebrew)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, copyFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { JobResponse } from '@sticker/core';

// ---- Setup ----

// Point DATA_DIR at a temp directory for tests
const TEST_DATA_DIR = path.join('/tmp', `sticker-test-${Date.now()}`);
process.env['DATA_DIR'] = TEST_DATA_DIR;

const FIXTURES_DIR = path.resolve('../../fixtures');

// Dynamically import processJob AFTER setting env var
let processJob: (jobId: string) => Promise<void>;

beforeAll(async () => {
  await mkdir(TEST_DATA_DIR, { recursive: true });
  const mod = await import('../src/processJob.js');
  processJob = mod.processJob;
});

afterAll(async () => {
  await rm(TEST_DATA_DIR, { recursive: true, force: true });
});

// ---- Helpers ----

async function createTestJob(fixtureName: string, inputExt = '.webp'): Promise<string> {
  const jobId = uuidv4();
  const jobDir = path.join(TEST_DATA_DIR, 'jobs', jobId);
  await mkdir(jobDir, { recursive: true });

  // Copy fixture to job directory
  const fixturePath = path.join(FIXTURES_DIR, fixtureName);
  await copyFile(fixturePath, path.join(jobDir, `input${inputExt}`));

  // Create initial job.json
  const now = new Date().toISOString();
  const jobJson: JobResponse & { _inputExt: string } = {
    id: jobId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    input: {
      filename: fixtureName,
      mimeType: inputExt === '.webp' ? 'image/webp' : 'image/gif',
      sizeBytes: 0,
      width: 0, height: 0,
      durationSec: 0, fps: 0, frameCount: 0,
      hasAlpha: true,
    },
    _inputExt: inputExt,
  };
  await mkdir(jobDir, { recursive: true });
  const jobPath = path.join(jobDir, 'job.json');
  await import('node:fs/promises').then(fs => fs.writeFile(jobPath, JSON.stringify(jobJson, null, 2)));

  return jobId;
}

async function readJobResult(jobId: string): Promise<JobResponse & { _inputExt?: string }> {
  const jobPath = path.join(TEST_DATA_DIR, 'jobs', jobId, 'job.json');
  const raw = await readFile(jobPath, 'utf-8');
  return JSON.parse(raw) as JobResponse & { _inputExt?: string };
}

// ---- Tests ----

describe('processJob integration (real ffmpeg + sharp)', () => {
  it('converts alpha_short.webp → valid Telegram sticker', async () => {
    const jobId = await createTestJob('alpha_short.webp', '.webp');
    await processJob(jobId);

    const result = await readJobResult(jobId);
    expect(result.status).toBe('done');

    // Output file exists
    const outputPath = path.join(TEST_DATA_DIR, 'jobs', jobId, 'output.webm');
    expect(existsSync(outputPath)).toBe(true);

    // Check output metadata
    const output = result.output!;
    expect(output.codec).toBe('vp9');
    expect(output.container).toContain('webm');
    expect(output.hasAudio).toBe(false);
    expect(output.durationSec).toBeLessThanOrEqual(3.0);
    expect(output.fps).toBeLessThanOrEqual(30);
    expect(output.fileSizeBytes).toBeLessThanOrEqual(256 * 1024);

    // Dimensions: one side = 512, other ≤ 512, both even
    expect(output.width % 2).toBe(0);
    expect(output.height % 2).toBe(0);
    const oneSide512 = output.width === 512 || output.height === 512;
    expect(oneSide512).toBe(true);
    expect(output.width).toBeLessThanOrEqual(512);
    expect(output.height).toBeLessThanOrEqual(512);

    // All Telegram checks pass
    expect(result.checks?.allPassed).toBe(true);
  });

  it('trims alpha_long.webp to ≤ 3 seconds', async () => {
    const jobId = await createTestJob('alpha_long.webp', '.webp');
    await processJob(jobId);

    const result = await readJobResult(jobId);
    expect(result.status).toBe('done');
    expect(result.output?.durationSec).toBeLessThanOrEqual(3.0);
    expect(result.checks?.durationOk).toBe(true);
  });

  it('scales large_dims.webp (800x600) to fit 512px', async () => {
    const jobId = await createTestJob('large_dims.webp', '.webp');
    await processJob(jobId);

    const result = await readJobResult(jobId);
    expect(result.status).toBe('done');

    const output = result.output!;
    // Landscape: width=512, height proportional (512*600/800=384)
    expect(output.width).toBeLessThanOrEqual(512);
    expect(output.height).toBeLessThanOrEqual(512);
    const oneSide512 = output.width === 512 || output.height === 512;
    expect(oneSide512).toBe(true);
    expect(result.checks?.dimensionsOk).toBe(true);
  });

  it('handles portrait.webp (300x500) — height=512, width proportional', async () => {
    const jobId = await createTestJob('portrait.webp', '.webp');
    await processJob(jobId);

    const result = await readJobResult(jobId);
    expect(result.status).toBe('done');

    const output = result.output!;
    expect(output.width).toBeLessThanOrEqual(512);
    expect(output.height).toBeLessThanOrEqual(512);
    const oneSide512 = output.width === 512 || output.height === 512;
    expect(oneSide512).toBe(true);
  });

  it('handles opaque.webp (no alpha) — uses yuv420p', async () => {
    const jobId = await createTestJob('opaque.webp', '.webp');
    await processJob(jobId);

    const result = await readJobResult(jobId);
    expect(result.status).toBe('done');
    // opaque source → no alpha channel needed
    expect(result.output?.pixFmt).toBe('yuv420p');
  });

  it('output file size is ≤ 256KB for all fixtures', async () => {
    const fixtures = ['alpha_short.webp', 'opaque.webp', 'portrait.webp'];

    for (const fixture of fixtures) {
      const jobId = await createTestJob(fixture, '.webp');
      await processJob(jobId);

      const result = await readJobResult(jobId);
      expect(result.status).toBe('done');
      expect(result.output!.fileSizeBytes).toBeLessThanOrEqual(256 * 1024);
      expect(result.checks?.sizeOk).toBe(true);
    }
  });
});
