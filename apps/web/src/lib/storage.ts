import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { JobResponse } from '@sticker/core';

const DATA_DIR = process.env['DATA_DIR'] ?? './data';

export function jobDir(jobId: string): string {
  return path.join(DATA_DIR, 'jobs', jobId);
}

export function inputPath(jobId: string, ext: string): string {
  return path.join(jobDir(jobId), 'input' + ext);
}

export function outputPath(jobId: string): string {
  return path.join(jobDir(jobId), 'output.webm');
}

export function jobJsonPath(jobId: string): string {
  return path.join(jobDir(jobId), 'job.json');
}

export async function readJobJson(jobId: string): Promise<JobResponse> {
  const filePath = jobJsonPath(jobId);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as JobResponse;
}

export async function writeJobJson(jobId: string, data: JobResponse): Promise<void> {
  const filePath = jobJsonPath(jobId);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function ensureJobDir(jobId: string): Promise<void> {
  await mkdir(jobDir(jobId), { recursive: true });
}
