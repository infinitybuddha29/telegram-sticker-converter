import type { InputInfo, EncodingStrategy } from './types.js';

const MAX_SIZE_BYTES = 256 * 1024;
const SIZE_MARGIN = 0.92;  // 8% margin for container overhead

// CRF progression
const CRF_STEPS = [30, 34, 38, 42, 46];
// FPS options (after CRF maxed)
const FPS_STEPS = [30, 24, 20, 15];
// Scale options (after FPS minimized)
const SCALE_STEPS = [512, 480, 448, 384];

function calcBitrate(durationSec: number, fps: number, scaleMax: number): number {
  // fps and scaleMax are accepted for potential future use; bitrate is purely duration-based
  void fps;
  void scaleMax;
  return Math.floor((MAX_SIZE_BYTES * 8) / durationSec * SIZE_MARGIN / 1000);
}

export function getInitialStrategy(input: InputInfo): EncodingStrategy {
  const duration = Math.max(Math.min(input.durationSec, 3.0), 0.5);
  const fps = Math.min(input.fps, 30);
  const scaleMax = 512;
  const bitrate = calcBitrate(duration, fps, scaleMax);

  return {
    crf: 30,
    fps,
    scaleMax,
    bitrate,
    hasAlpha: input.hasAlpha,
    sourceWidth: input.width,
    sourceHeight: input.height,
    pass: 1,
  };
}

export function getNextStrategy(
  current: EncodingStrategy,
  outputSizeBytes: number
): EncodingStrategy | null {
  void outputSizeBytes;

  // Determine current position in each dimension
  const crfIndex = CRF_STEPS.indexOf(current.crf);
  const fpsIndex = FPS_STEPS.indexOf(current.fps);
  const scaleIndex = SCALE_STEPS.indexOf(current.scaleMax);

  // Step 1: Try increasing CRF (if not at max)
  if (crfIndex !== -1 && crfIndex < CRF_STEPS.length - 1) {
    const nextCrf = CRF_STEPS[crfIndex + 1]!;
    return {
      ...current,
      crf: nextCrf,
      pass: current.pass + 1,
    };
  }

  // Step 2: CRF is maxed (at 46), try reducing FPS
  if (crfIndex === CRF_STEPS.length - 1 || crfIndex === -1) {
    const nextFpsIndex = fpsIndex !== -1 ? fpsIndex + 1 : 1;
    if (nextFpsIndex < FPS_STEPS.length) {
      const nextFps = FPS_STEPS[nextFpsIndex]!;
      // Recalculate bitrate when fps changes
      const duration = Math.max(Math.min(3.0, 3.0), 0.5);
      const bitrate = calcBitrate(duration, nextFps, current.scaleMax);
      return {
        ...current,
        crf: CRF_STEPS[0]!,  // reset CRF to 30 when reducing fps
        fps: nextFps,
        bitrate,
        pass: current.pass + 1,
      };
    }
  }

  // Step 3: FPS is at minimum (15), try reducing scale
  if (fpsIndex === FPS_STEPS.length - 1) {
    const nextScaleIndex = scaleIndex !== -1 ? scaleIndex + 1 : 1;
    if (nextScaleIndex < SCALE_STEPS.length) {
      const nextScale = SCALE_STEPS[nextScaleIndex]!;
      const duration = Math.max(Math.min(3.0, 3.0), 0.5);
      const bitrate = calcBitrate(duration, current.fps, nextScale);
      return {
        ...current,
        crf: CRF_STEPS[0]!,  // reset CRF
        fps: FPS_STEPS[FPS_STEPS.length - 1]!,  // keep fps at min
        scaleMax: nextScale,
        bitrate,
        pass: current.pass + 1,
      };
    }
  }

  // All options exhausted
  return null;
}
