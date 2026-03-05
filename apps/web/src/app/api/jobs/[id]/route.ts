import { NextRequest, NextResponse } from 'next/server';
import { readJobJson } from '@/lib/storage';

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

  // Remove internal _inputExt field before returning
  const { _inputExt: _removed, ...publicData } = jobData as typeof jobData & {
    _inputExt?: string;
  };

  return NextResponse.json(publicData);
}
