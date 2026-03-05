import { describe, it, expect } from 'vitest';
import { checkTelegramSpec } from '../src/telegramSpec.js';
import type { OutputMeta } from '../src/types.js';

function validMeta(): OutputMeta {
  return {
    codec: 'vp9',
    container: 'webm',
    width: 512,
    height: 384,
    durationSec: 2.5,
    fps: 24,
    hasAudio: false,
    fileSizeBytes: 200000,
    hasAlpha: true,
    pixFmt: 'yuva420p',
  };
}

describe('checkTelegramSpec', () => {
  it('accepts valid landscape 512x384', () => {
    const result = checkTelegramSpec(validMeta());
    expect(result.allPassed).toBe(true);
    expect(result.dimensionsOk).toBe(true);
  });

  it('accepts valid portrait 384x512', () => {
    const meta: OutputMeta = { ...validMeta(), width: 384, height: 512 };
    const result = checkTelegramSpec(meta);
    expect(result.allPassed).toBe(true);
    expect(result.dimensionsOk).toBe(true);
  });

  it('accepts valid square 512x512', () => {
    const meta: OutputMeta = { ...validMeta(), width: 512, height: 512 };
    const result = checkTelegramSpec(meta);
    expect(result.allPassed).toBe(true);
    expect(result.dimensionsOk).toBe(true);
  });

  it('rejects 513x512 (no side is exactly 512)', () => {
    const meta: OutputMeta = { ...validMeta(), width: 513, height: 512 };
    const result = checkTelegramSpec(meta);
    expect(result.dimensionsOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects 511x384 (no side is exactly 512)', () => {
    const meta: OutputMeta = { ...validMeta(), width: 511, height: 384 };
    const result = checkTelegramSpec(meta);
    expect(result.dimensionsOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects odd dimensions 511x384', () => {
    // 511 is odd, so dimensionsOk must be false regardless of which side is 512
    const meta: OutputMeta = { ...validMeta(), width: 511, height: 384 };
    const result = checkTelegramSpec(meta);
    expect(result.dimensionsOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects duration > 3.0', () => {
    const meta: OutputMeta = { ...validMeta(), durationSec: 3.1 };
    const result = checkTelegramSpec(meta);
    expect(result.durationOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects fps > 30', () => {
    const meta: OutputMeta = { ...validMeta(), fps: 31 };
    const result = checkTelegramSpec(meta);
    expect(result.fpsOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects file size > 262144 bytes', () => {
    const meta: OutputMeta = { ...validMeta(), fileSizeBytes: 262145 };
    const result = checkTelegramSpec(meta);
    expect(result.sizeOk).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects when has audio', () => {
    const meta: OutputMeta = { ...validMeta(), hasAudio: true };
    const result = checkTelegramSpec(meta);
    expect(result.noAudio).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects h264 codec', () => {
    const meta: OutputMeta = { ...validMeta(), codec: 'h264' };
    const result = checkTelegramSpec(meta);
    expect(result.vp9).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('rejects mp4 container', () => {
    const meta: OutputMeta = { ...validMeta(), container: 'mp4' };
    const result = checkTelegramSpec(meta);
    expect(result.webm).toBe(false);
    expect(result.allPassed).toBe(false);
  });

  it('allPassed is false if any check fails', () => {
    // Just one failing field
    const meta: OutputMeta = { ...validMeta(), fps: 60 };
    const result = checkTelegramSpec(meta);
    expect(result.fpsOk).toBe(false);
    expect(result.allPassed).toBe(false);
    // All other individual checks should still pass
    expect(result.webm).toBe(true);
    expect(result.vp9).toBe(true);
    expect(result.noAudio).toBe(true);
    expect(result.durationOk).toBe(true);
    expect(result.sizeOk).toBe(true);
    expect(result.dimensionsOk).toBe(true);
  });
});
