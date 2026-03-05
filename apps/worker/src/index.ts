import { Worker, Queue } from 'bullmq';
import { processJob } from './processJob.js';
import { runCleanup } from './cleanup.js';
import { config } from './config.js';

const connection = {
  host: new URL(config.redisUrl).hostname,
  port: parseInt(new URL(config.redisUrl).port || '6379', 10),
};

// Main conversion worker
const worker = new Worker(
  'sticker-convert',
  async (job) => {
    if (job.name === 'cleanup') {
      await runCleanup();
    } else {
      await processJob(job.data.jobId as string);
    }
  },
  { connection, concurrency: config.workerConcurrency }
);

worker.on('completed', (job) => {
  if (job.name !== 'cleanup') {
    console.log(`Job ${job.id} completed`);
  }
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
});

// Schedule cleanup every hour
const cleanupQueue = new Queue('sticker-convert', { connection });
cleanupQueue.add('cleanup', {}, {
  repeat: { every: 60 * 60 * 1000 },  // every hour
  jobId: 'cleanup-repeatable',
}).catch(() => { /* ignore if already scheduled */ });

console.log('Worker started, waiting for jobs...');
