import { readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const TTL_MS = parseInt(process.env['FILE_TTL_HOURS'] ?? '24', 10) * 60 * 60 * 1000;

export async function runCleanup(): Promise<void> {
  const jobsDir = path.join(config.dataDir, 'jobs');
  const now = Date.now();

  let entries: string[];
  try {
    entries = await readdir(jobsDir);
  } catch {
    // Directory doesn't exist yet — nothing to clean up
    return;
  }

  let removed = 0;
  for (const entry of entries) {
    const entryPath = path.join(jobsDir, entry);
    try {
      const info = await stat(entryPath);
      const ageMs = now - info.mtimeMs;
      if (ageMs > TTL_MS) {
        await rm(entryPath, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Skip entries we can't read
    }
  }

  if (removed > 0) {
    console.log(`Cleanup: removed ${removed} expired job directories`);
  }
}
