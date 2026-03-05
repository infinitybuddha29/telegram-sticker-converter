import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateUpload } from '@/lib/validateUpload';
import { ensureJobDir, jobDir, writeJobJson } from '@/lib/storage';
import { getQueue } from '@/lib/queue';
import type { JobResponse } from '@sticker/core';

// Simple in-memory rate limiter: 10 requests per minute per IP
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || entry.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again in 60 seconds.',
        },
      },
      { status: 429 }
    );
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'No file provided. Please upload a file.',
        },
      },
      { status: 400 }
    );
  }

  // Convert to Buffer and validate
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = validateUpload(buffer, file.name, 20);

  if (!result.valid) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: result.error,
        },
      },
      { status: 400 }
    );
  }

  const ext = result.ext!;
  const mime = result.mime!;

  // Generate job ID
  const jobId = uuidv4();

  // Sanitize filename: keep only the basename, strip path separators
  const sanitizedFilename = path.basename(file.name).replace(/[/\\]/g, '');

  // Create job directory
  await ensureJobDir(jobId);

  // Save input file
  await writeFile(path.join(jobDir(jobId), 'input' + ext), buffer);

  // Create initial job.json
  const now = new Date().toISOString();
  const jobData: JobResponse = {
    id: jobId,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    input: {
      filename: sanitizedFilename,
      mimeType: mime,
      sizeBytes: buffer.length,
      width: 0,
      height: 0,
      durationSec: 0,
      fps: 0,
      frameCount: 0,
      hasAlpha: false,
    },
    // _inputExt is an internal field for the worker — cast to bypass type check
    ...({ _inputExt: ext } as object),
  } as JobResponse & { _inputExt: string };

  await writeJobJson(jobId, jobData);

  // Enqueue job to BullMQ
  await getQueue().add('convert', { jobId }, { jobId });

  return NextResponse.json({ jobId }, { status: 201 });
}
