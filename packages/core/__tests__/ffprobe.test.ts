import { describe, it, expect } from 'vitest';
import { parseFrameRate, parseFps, detectAlpha, parseDuration } from '../src/ffprobe.js';

describe('parseFrameRate', () => {
  it('parses standard "30/1" frame rate', () => {
    expect(parseFrameRate('30/1')).toBe(30);
  });

  it('parses "25/1" frame rate', () => {
    expect(parseFrameRate('25/1')).toBe(25);
  });

  it('parses fractional frame rates like "30000/1001"', () => {
    const fps = parseFrameRate('30000/1001');
    expect(fps).toBeCloseTo(29.97, 1);
  });

  it('returns NaN for "0/0" (invalid animated webp frame rate)', () => {
    const result = parseFrameRate('0/0');
    expect(isNaN(result) || !isFinite(result)).toBe(true);
  });

  it('returns NaN for undefined input', () => {
    expect(isNaN(parseFrameRate(undefined))).toBe(true);
  });
});

describe('parseFps', () => {
  it('returns fps from r_frame_rate when valid', () => {
    const stream = { r_frame_rate: '24/1', avg_frame_rate: '0/0' };
    const format = {};
    expect(parseFps(stream, format)).toBe(24);
  });

  it('falls back to avg_frame_rate when r_frame_rate is 0/0', () => {
    const stream = { r_frame_rate: '0/0', avg_frame_rate: '20/1' };
    const format = {};
    expect(parseFps(stream, format)).toBe(20);
  });

  it('calculates fps from nb_frames / duration when both rate strings are invalid', () => {
    const stream = {
      r_frame_rate: '0/0',
      avg_frame_rate: '0/0',
      nb_frames: '60',
      duration: '2.0',
    };
    const format = {};
    expect(parseFps(stream, format)).toBe(30);
  });

  it('defaults to 24 fps when no valid data is available', () => {
    const stream = { r_frame_rate: '0/0', avg_frame_rate: '0/0' };
    const format = {};
    expect(parseFps(stream, format)).toBe(24);
  });

  it('clamps fps to 30 maximum', () => {
    const stream = { r_frame_rate: '60/1' };
    const format = {};
    expect(parseFps(stream, format)).toBe(30);
  });

  it('clamps fps to 1 minimum', () => {
    const stream = {
      r_frame_rate: '0/0',
      avg_frame_rate: '0/0',
      nb_frames: '1',
      duration: '1000',  // 0.001 fps → clamp to 1
    };
    const format = {};
    expect(parseFps(stream, format)).toBe(1);
  });
});

describe('detectAlpha', () => {
  it('detects alpha from yuva420p pix_fmt', () => {
    expect(detectAlpha('yuva420p')).toBe(true);
  });

  it('detects alpha from rgba pix_fmt', () => {
    expect(detectAlpha('rgba')).toBe(true);
  });

  it('detects alpha from ya8 pix_fmt', () => {
    expect(detectAlpha('ya8')).toBe(true);
  });

  it('detects alpha from bgra pix_fmt', () => {
    expect(detectAlpha('bgra')).toBe(true);
  });

  it('detects alpha from argb pix_fmt', () => {
    expect(detectAlpha('argb')).toBe(true);
  });

  it('returns false for yuv420p (no alpha)', () => {
    expect(detectAlpha('yuv420p')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(detectAlpha(undefined)).toBe(false);
  });
});

describe('parseDuration', () => {
  it('parses duration from stream', () => {
    const stream = { duration: '2.5' };
    const format = {};
    expect(parseDuration(stream, format)).toBe(2.5);
  });

  it('falls back to format duration when stream duration is missing', () => {
    const stream = {};
    const format = { duration: '3.0' };
    expect(parseDuration(stream, format)).toBe(3.0);
  });

  it('returns 0 when duration is missing from both stream and format', () => {
    const stream = {};
    const format = {};
    expect(parseDuration(stream, format)).toBe(0);
  });
});
