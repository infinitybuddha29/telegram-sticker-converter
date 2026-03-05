# API Contracts

## Types (shared in packages/core/src/types.ts)

```typescript
// Job lifecycle
export type JobStatus = "queued" | "processing" | "done" | "failed";

// Metadata about the converted output
export interface OutputMeta {
  codec: string;         // "vp9"
  container: string;     // "webm"
  width: number;         // e.g. 512
  height: number;        // e.g. 384
  durationSec: number;   // e.g. 2.8
  fps: number;           // e.g. 24
  hasAudio: boolean;     // always false
  fileSizeBytes: number; // e.g. 245000
  hasAlpha: boolean;     // true/false
  pixFmt: string;        // "yuva420p" or "yuv420p"
}

// Telegram compliance checks
export interface TelegramChecks {
  webm: boolean;         // container is webm
  vp9: boolean;          // codec is vp9
  noAudio: boolean;      // no audio stream
  fpsOk: boolean;        // fps ≤ 30
  durationOk: boolean;   // duration ≤ 3.0
  sizeOk: boolean;       // file size ≤ 256KB
  dimensionsOk: boolean; // one side = 512, other ≤ 512, both even
  allPassed: boolean;    // all above are true
}

// Encoding strategy used (for transparency/debugging)
export interface EncodingStrategy {
  crf: number;
  fps: number;
  scaleMax: number;      // longest side target
  bitrate: number;       // kbps
  pass: number;          // which iteration produced the result
}

// Input file info
export interface InputInfo {
  filename: string;      // original filename (sanitized)
  mimeType: string;      // "image/webp"
  sizeBytes: number;     // original file size
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  frameCount: number;
  hasAlpha: boolean;
}

// Full job response
export interface JobResponse {
  id: string;
  status: JobStatus;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601

  input: InputInfo;
  output?: OutputMeta;
  checks?: TelegramChecks;
  strategy?: EncodingStrategy;

  error?: {
    code: string;        // e.g. "ENCODING_FAILED", "SIZE_LIMIT", "INVALID_INPUT"
    message: string;     // human-readable
  };

  downloadUrl?: string;  // "/api/jobs/{id}/download" when status=done
}
```

## Endpoints

### POST /api/jobs

Upload a file for conversion.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` field with the uploaded file

**Response (201):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error responses:**
- `400` — No file / invalid file type / file too large
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "File must be an animated WebP image"
  }
}
```
- `429` — Rate limited
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds."
  }
}
```

### GET /api/jobs/:id

Get job status and results.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "done",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:05Z",
  "input": {
    "filename": "sticker.webp",
    "mimeType": "image/webp",
    "sizeBytes": 1048576,
    "width": 800,
    "height": 600,
    "durationSec": 2.5,
    "fps": 24,
    "frameCount": 60,
    "hasAlpha": true
  },
  "output": {
    "codec": "vp9",
    "container": "webm",
    "width": 512,
    "height": 384,
    "durationSec": 2.5,
    "fps": 24,
    "hasAudio": false,
    "fileSizeBytes": 245000,
    "hasAlpha": true,
    "pixFmt": "yuva420p"
  },
  "checks": {
    "webm": true,
    "vp9": true,
    "noAudio": true,
    "fpsOk": true,
    "durationOk": true,
    "sizeOk": true,
    "dimensionsOk": true,
    "allPassed": true
  },
  "strategy": {
    "crf": 30,
    "fps": 24,
    "scaleMax": 512,
    "bitrate": 680,
    "pass": 1
  },
  "downloadUrl": "/api/jobs/550e8400-e29b-41d4-a716-446655440000/download"
}
```

**Error:**
- `404` — Job not found

### GET /api/jobs/:id/download

Download the converted WebM file.

**Response (200):**
- Content-Type: `video/webm`
- Content-Disposition: `attachment; filename="sticker.webm"`
- Body: binary file

**Errors:**
- `404` — Job not found or not yet complete
- `410` — File expired (TTL exceeded)
