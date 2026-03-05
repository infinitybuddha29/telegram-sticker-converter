import type { OutputMeta, TelegramChecks } from './types.js';

const MAX_SIZE_BYTES = 256 * 1024;  // 262144
const MAX_DURATION_SEC = 3.0;
const MAX_FPS = 30;
const REQUIRED_SIDE = 512;

export function checkTelegramSpec(meta: OutputMeta): TelegramChecks {
  const webm = meta.container.includes('webm');
  const vp9 = meta.codec === 'vp9';
  const noAudio = !meta.hasAudio;
  const fpsOk = meta.fps <= MAX_FPS;
  const durationOk = meta.durationSec <= MAX_DURATION_SEC;
  const sizeOk = meta.fileSizeBytes <= MAX_SIZE_BYTES;

  // Dimension check:
  // - Both width and height must be even numbers
  // - Either width === 512 and height <= 512, OR height === 512 and width <= 512
  // - Both must be > 0
  const { width, height } = meta;
  const bothPositive = width > 0 && height > 0;
  const bothEven = width % 2 === 0 && height % 2 === 0;
  const landscapeOk = width === REQUIRED_SIDE && height <= REQUIRED_SIDE;
  const portraitOk = height === REQUIRED_SIDE && width <= REQUIRED_SIDE;
  const dimensionsOk = bothPositive && bothEven && (landscapeOk || portraitOk);

  const allChecks = [webm, vp9, noAudio, fpsOk, durationOk, sizeOk, dimensionsOk];
  const allPassed = allChecks.every(v => v);

  return {
    webm,
    vp9,
    noAudio,
    fpsOk,
    durationOk,
    sizeOk,
    dimensionsOk,
    allPassed,
  };
}
