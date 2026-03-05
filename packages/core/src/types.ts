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
  fpsOk: boolean;        // fps <= 30
  durationOk: boolean;   // duration <= 3.0
  sizeOk: boolean;       // file size <= 256KB
  dimensionsOk: boolean; // one side = 512, other <= 512, both even
  allPassed: boolean;    // all above are true
}

// Encoding strategy used (for transparency/debugging)
export interface EncodingStrategy {
  crf: number;
  fps: number;
  scaleMax: number;      // longest side target
  bitrate: number;       // kbps
  pass: number;          // which iteration produced the result
  hasAlpha: boolean;
  sourceWidth: number;
  sourceHeight: number;
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

// Response from POST /api/jobs
export interface CreateJobResponse {
  jobId: string;
}
