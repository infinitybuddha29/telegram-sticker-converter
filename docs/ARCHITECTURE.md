# Architecture

## System Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────┐     ┌────────────┐
│   Browser    │────▶│  Next.js API     │────▶│  Redis   │────▶│   Worker   │
│   (React)    │◀────│  (upload/status) │     │ (BullMQ) │     │  (ffmpeg)  │
└─────────────┘     └──────────────────┘     └─────────┘     └────────────┘
                           │                                       │
                           ▼                                       ▼
                    ┌──────────────┐                        ┌──────────────┐
                    │  ./data/jobs │◀───────────────────────│  ./data/jobs │
                    │  (storage)   │                        │  (storage)   │
                    └──────────────┘                        └──────────────┘
```

## Request Flow

### Upload Flow
1. User drops file on UploadDropzone
2. Browser sends `POST /api/jobs` (multipart/form-data)
3. API route:
   - Validates file (magic bytes: `RIFF....WEBP`, size ≤ 20MB)
   - Generates `jobId` (uuid v4)
   - Creates `./data/jobs/{jobId}/` directory
   - Saves input file as `./data/jobs/{jobId}/input.webp`
   - Extracts basic metadata via ffprobe
   - Enqueues job to BullMQ queue `sticker-convert`
   - Returns `{ jobId }`
4. UI starts polling `GET /api/jobs/{jobId}` every 1 second

### Processing Flow (Worker)
1. Worker picks job from BullMQ queue
2. Runs `processJob(jobId)`:
   a. Read input metadata (ffprobe)
   b. Calculate initial encoding strategy:
      - Target bitrate = `(256 * 1024 * 8) / min(duration, 3)` bps (with 5% margin)
      - FPS = min(source_fps, 30)
      - Scale = fit longest side to 512, preserve aspect ratio
   c. Run two-pass VP9 encode (ffmpeg)
   d. Check output size:
      - If ≤ 256KB → done
      - If > 256KB → reduce bitrate by 15%, retry (max 5 attempts)
      - If still > 256KB → reduce fps (30→24→20→15)
      - If still > 256KB → reduce content scale (512→480→448→384)
   e. Run ffprobe on output
   f. Run telegramSpec checker
   g. Write job result JSON to `./data/jobs/{jobId}/job.json`
   h. Save output as `./data/jobs/{jobId}/output.webm`

### Download Flow
1. `GET /api/jobs/{jobId}/download`
2. Read `./data/jobs/{jobId}/output.webm`
3. Stream file with `Content-Disposition: attachment`

## Data Storage

### Job Directory Structure
```
./data/jobs/{jobId}/
├── input.webp       # Original uploaded file
├── output.webm      # Converted result (when done)
├── job.json         # Job metadata and status
└── ffmpeg.log       # FFmpeg stderr (for debugging)
```

### job.json Schema
See `docs/API_CONTRACTS.md` for the `JobResponse` type — job.json mirrors this structure.

## Concurrency & Limits
- Worker concurrency: 2 (configurable via `WORKER_CONCURRENCY` env var)
- Max input file size: 20MB
- Job timeout: 120 seconds
- Max encoding attempts: 5
- File TTL: 24 hours (cleanup via cron job or BullMQ repeatable job)

## Environment Variables
```
REDIS_URL=redis://localhost:6379      # Redis connection
DATA_DIR=./data                       # Storage directory
WORKER_CONCURRENCY=2                  # Parallel ffmpeg processes
MAX_UPLOAD_SIZE_MB=20                 # Upload size limit
JOB_TIMEOUT_MS=120000                 # Job timeout
FILE_TTL_HOURS=24                     # Auto-delete after N hours
```

## Security
- Filename sanitization: strip path separators, use uuid-based directories
- Magic byte validation for WebP: first 4 bytes = `RIFF`, bytes 8-12 = `WEBP`
- No shell injection: use `child_process.execFile` (not `exec`) for ffmpeg/ffprobe
- Rate limit: 10 requests per minute per IP (via middleware)
- CORS: same-origin only (Next.js default)
