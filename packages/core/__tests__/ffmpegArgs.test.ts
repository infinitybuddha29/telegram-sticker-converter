import { describe, it, expect } from 'vitest';
import { buildTwoPassArgs } from '../src/ffmpegArgs.js';
import type { EncodingStrategy } from '../src/types.js';

function baseStrategy(): EncodingStrategy {
  return {
    crf: 30,
    fps: 24,
    scaleMax: 512,
    bitrate: 680,
    hasAlpha: true,
    sourceWidth: 400,
    sourceHeight: 400,
    pass: 1,
  };
}

const INPUT_PATH = '/tmp/input.webp';
const OUTPUT_PATH = '/tmp/output.webm';
const JOB_ID = 'test-job-123';
const TMP_DIR = '/tmp';

describe('buildTwoPassArgs', () => {
  it('contains -c:v libvpx-vp9 in pass2 args', () => {
    const { pass2 } = buildTwoPassArgs(baseStrategy(), INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    expect(pass2).toContain('-c:v');
    const idx = pass2.indexOf('-c:v');
    expect(pass2[idx + 1]).toBe('libvpx-vp9');
  });

  it('contains -an in both passes', () => {
    const { pass1, pass2 } = buildTwoPassArgs(baseStrategy(), INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    expect(pass1).toContain('-an');
    expect(pass2).toContain('-an');
  });

  it('contains -auto-alt-ref 0 when hasAlpha is true', () => {
    const strategy = { ...baseStrategy(), hasAlpha: true };
    const { pass1, pass2 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    expect(pass1).toContain('-auto-alt-ref');
    const idx1 = pass1.indexOf('-auto-alt-ref');
    expect(pass1[idx1 + 1]).toBe('0');
    expect(pass2).toContain('-auto-alt-ref');
    const idx2 = pass2.indexOf('-auto-alt-ref');
    expect(pass2[idx2 + 1]).toBe('0');
  });

  it('does NOT contain -auto-alt-ref 0 when hasAlpha is false', () => {
    const strategy = { ...baseStrategy(), hasAlpha: false };
    const { pass1, pass2 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    expect(pass1).not.toContain('-auto-alt-ref');
    expect(pass2).not.toContain('-auto-alt-ref');
  });

  it('pass1 ends with -f null /dev/null', () => {
    const { pass1 } = buildTwoPassArgs(baseStrategy(), INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    const len = pass1.length;
    expect(pass1[len - 3]).toBe('-f');
    expect(pass1[len - 2]).toBe('null');
    expect(pass1[len - 1]).toBe('/dev/null');
  });

  it('pass2 output path is the provided outputPath', () => {
    const { pass2 } = buildTwoPassArgs(baseStrategy(), INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    expect(pass2[pass2.length - 1]).toBe(OUTPUT_PATH);
  });

  it('uses scale=512:-2 filter for landscape (width >= height)', () => {
    const strategy = { ...baseStrategy(), sourceWidth: 600, sourceHeight: 400 };
    const { pass1 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    const vfIdx = pass1.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const filterChain = pass1[vfIdx + 1] ?? '';
    expect(filterChain).toContain('scale=512:-2');
    expect(filterChain).not.toContain('scale=-2:512');
  });

  it('uses scale=-2:512 filter for portrait (height > width)', () => {
    const strategy = { ...baseStrategy(), sourceWidth: 300, sourceHeight: 500 };
    const { pass1 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    const vfIdx = pass1.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const filterChain = pass1[vfIdx + 1] ?? '';
    expect(filterChain).toContain('scale=-2:512');
    expect(filterChain).not.toContain('scale=512:-2');
  });

  it('uses yuva420p pix_fmt when hasAlpha is true', () => {
    const strategy = { ...baseStrategy(), hasAlpha: true };
    const { pass1, pass2 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    const pixIdx1 = pass1.indexOf('-pix_fmt');
    expect(pass1[pixIdx1 + 1]).toBe('yuva420p');
    const pixIdx2 = pass2.indexOf('-pix_fmt');
    expect(pass2[pixIdx2 + 1]).toBe('yuva420p');
  });

  it('uses yuv420p pix_fmt when hasAlpha is false', () => {
    const strategy = { ...baseStrategy(), hasAlpha: false };
    const { pass1, pass2 } = buildTwoPassArgs(strategy, INPUT_PATH, OUTPUT_PATH, JOB_ID, TMP_DIR);
    const pixIdx1 = pass1.indexOf('-pix_fmt');
    expect(pass1[pixIdx1 + 1]).toBe('yuv420p');
    const pixIdx2 = pass2.indexOf('-pix_fmt');
    expect(pass2[pixIdx2 + 1]).toBe('yuv420p');
  });

  it('sets correct passlogfile prefix', () => {
    const { pass1, pass2, passLogPrefix } = buildTwoPassArgs(
      baseStrategy(), INPUT_PATH, OUTPUT_PATH, JOB_ID, '/tmp'
    );
    expect(passLogPrefix).toBe(`/tmp/${JOB_ID}_vpx`);
    const logIdx1 = pass1.indexOf('-passlogfile');
    expect(pass1[logIdx1 + 1]).toBe(passLogPrefix);
    const logIdx2 = pass2.indexOf('-passlogfile');
    expect(pass2[logIdx2 + 1]).toBe(passLogPrefix);
  });
});
