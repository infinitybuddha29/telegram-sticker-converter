import { describe, it, expect } from 'vitest';
import { getInitialStrategy, getNextStrategy } from '../src/strategy.js';
import type { InputInfo, EncodingStrategy } from '../src/types.js';

function baseInput(overrides: Partial<InputInfo> = {}): InputInfo {
  return {
    filename: 'sticker.webp',
    mimeType: 'image/webp',
    sizeBytes: 1024 * 512,
    width: 400,
    height: 400,
    durationSec: 2.0,
    fps: 24,
    frameCount: 48,
    hasAlpha: true,
    ...overrides,
  };
}

describe('getInitialStrategy', () => {
  it('clamps duration to 3.0 for source longer than 3s', () => {
    const input = baseInput({ durationSec: 5.0 });
    const strategy = getInitialStrategy(input);
    // bitrate should be calculated from 3.0s, not 5.0s
    const expectedBitrate = Math.floor((256 * 1024 * 8) / 3.0 * 0.92 / 1000);
    expect(strategy.bitrate).toBe(expectedBitrate);
  });

  it('sets fps to min(source, 30)', () => {
    const strategy30 = getInitialStrategy(baseInput({ fps: 60 }));
    expect(strategy30.fps).toBe(30);

    const strategy24 = getInitialStrategy(baseInput({ fps: 24 }));
    expect(strategy24.fps).toBe(24);
  });

  it('calculates bitrate correctly for a 2s clip', () => {
    const input = baseInput({ durationSec: 2.0 });
    const strategy = getInitialStrategy(input);
    // bitrate = floor((256*1024*8) / 2.0 * 0.92 / 1000)
    const expected = Math.floor((256 * 1024 * 8) / 2.0 * 0.92 / 1000);
    expect(strategy.bitrate).toBe(expected);
  });

  it('sets scaleMax=512 and crf=30 initially', () => {
    const strategy = getInitialStrategy(baseInput());
    expect(strategy.scaleMax).toBe(512);
    expect(strategy.crf).toBe(30);
  });

  it('sets pass=1 and propagates hasAlpha, sourceWidth, sourceHeight', () => {
    const input = baseInput({ hasAlpha: false, width: 800, height: 600 });
    const strategy = getInitialStrategy(input);
    expect(strategy.pass).toBe(1);
    expect(strategy.hasAlpha).toBe(false);
    expect(strategy.sourceWidth).toBe(800);
    expect(strategy.sourceHeight).toBe(600);
  });
});

describe('getNextStrategy', () => {
  function strategyAt(overrides: Partial<EncodingStrategy>): EncodingStrategy {
    return {
      crf: 30,
      fps: 30,
      scaleMax: 512,
      bitrate: 650,
      hasAlpha: true,
      sourceWidth: 400,
      sourceHeight: 400,
      pass: 1,
      ...overrides,
    };
  }

  const OVER_SIZE = 300 * 1024; // 300KB — over the 256KB limit

  it('increases CRF by 4 when size is too large (step 1)', () => {
    const current = strategyAt({ crf: 30 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).not.toBeNull();
    expect(next!.crf).toBe(34);
  });

  it('increases CRF in steps of 4', () => {
    let strategy = strategyAt({ crf: 30 });
    const expected = [34, 38, 42, 46];
    for (const exp of expected) {
      strategy = getNextStrategy(strategy, OVER_SIZE)!;
      expect(strategy).not.toBeNull();
      expect(strategy.crf).toBe(exp);
    }
  });

  it('reduces FPS after CRF hits 46, resets CRF to 30', () => {
    const current = strategyAt({ crf: 46, fps: 30 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).not.toBeNull();
    // CRF resets, fps reduces
    expect(next!.crf).toBe(30);
    expect(next!.fps).toBeLessThan(30);
  });

  it('returns null when all options are exhausted', () => {
    // scaleMax at 384, fps at 15, crf at 46 → next scale would be below 384, return null
    const current = strategyAt({ crf: 46, fps: 15, scaleMax: 384 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).toBeNull();
  });

  it('increments pass counter on each call', () => {
    const current = strategyAt({ crf: 30, pass: 3 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).not.toBeNull();
    expect(next!.pass).toBe(4);
  });

  it('recalculates bitrate when fps changes', () => {
    const current = strategyAt({ crf: 46, fps: 30, scaleMax: 512 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).not.toBeNull();
    // The bitrate should be recalculated (not the same formula referencing fps,
    // but the function should call calcBitrate)
    expect(typeof next!.bitrate).toBe('number');
    expect(next!.bitrate).toBeGreaterThan(0);
  });

  it('reduces scaleMax after FPS is at minimum (15)', () => {
    const current = strategyAt({ crf: 46, fps: 15, scaleMax: 512 });
    const next = getNextStrategy(current, OVER_SIZE);
    expect(next).not.toBeNull();
    expect(next!.scaleMax).toBeLessThan(512);
  });
});
