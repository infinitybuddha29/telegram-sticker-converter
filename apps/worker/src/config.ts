import { readFileSync } from 'node:fs';
import path from 'node:path';

// Load root .env if env vars not already set
function loadRootEnv(): void {
  if (process.env['_STICKER_ENV_LOADED']) return;
  // __dirname is the compiled dist/src directory; root is 3 levels up
  const envPath = path.resolve(__dirname, '../../../.env');
  try {
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env not found — defaults will be used
  }
  process.env['_STICKER_ENV_LOADED'] = '1';
}

loadRootEnv();

// Default dataDir: absolute path to {monorepo-root}/data
// __dirname when running compiled is: .../apps/worker/dist
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../data');

export const config = {
  redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  dataDir: process.env['DATA_DIR'] ?? DEFAULT_DATA_DIR,
  workerConcurrency: parseInt(process.env['WORKER_CONCURRENCY'] ?? '2', 10),
  jobTimeoutMs: parseInt(process.env['JOB_TIMEOUT_MS'] ?? '120000', 10),
};
