import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { appendFile } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export interface RunResult {
  exitCode: number;
  stderr: string;
}

/** Run ffmpeg with the given args. Captures stderr. Throws on non-zero exit. */
export async function runFfmpeg(
  args: string[],
  logFile: string,
  timeoutMs: number
): Promise<RunResult> {
  let stderr = '';

  try {
    const result = await execFileAsync('ffmpeg', args, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeoutMs,
    });
    // ffmpeg writes to stderr even on success
    stderr = result.stderr ?? '';
    await appendFile(logFile, stderr, 'utf-8');
    return { exitCode: 0, stderr };
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException & {
      stderr?: string;
      killed?: boolean;
      signal?: string;
    };

    stderr = error.stderr ?? '';
    await appendFile(logFile, stderr, 'utf-8').catch(() => {
      // best-effort log write — don't mask the original error
    });

    if (error.killed === true || error.signal === 'SIGTERM') {
      throw new Error('FFmpeg timed out');
    }

    // Extract last non-empty line of stderr for a readable error message
    const lines = stderr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const lastLine = lines[lines.length - 1] ?? 'unknown error';
    throw new Error(`FFmpeg failed: ${lastLine}`);
  }
}
