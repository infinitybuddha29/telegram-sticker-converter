import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { readJobJson, outputPath } from '@/lib/storage';

// UUID v4 format validation — prevents path traversal attacks
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // Validate UUID format to prevent path traversal
  if (!UUID_V4_REGEX.test(id)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid job ID format.',
        },
      },
      { status: 400 }
    );
  }

  // Read job metadata
  let jobData: Awaited<ReturnType<typeof readJobJson>>;
  try {
    jobData = await readJobJson(id);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Job not found',
        },
      },
      { status: 404 }
    );
  }

  // Only allow download when job is done
  if (jobData.status !== 'done') {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Job not complete yet',
        },
      },
      { status: 404 }
    );
  }

  // Read output file
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(outputPath(id));
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Output file not found',
        },
      },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'video/webm',
      'Content-Disposition': 'attachment; filename="sticker.webm"',
      'Content-Length': String(fileBuffer.length),
    },
  });
}
