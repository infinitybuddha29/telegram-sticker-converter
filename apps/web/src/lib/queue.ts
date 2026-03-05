import { Queue } from 'bullmq';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

let _queue: Queue | null = null;

export function getQueue(): Queue {
  if (!_queue) {
    const url = new URL(REDIS_URL);
    _queue = new Queue('sticker-convert', {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        username: url.username || undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
      },
    });
  }
  return _queue;
}
