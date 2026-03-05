import { describe, it, expect } from 'vitest';
import { validateWebpMagicBytes, validateFileSize } from '../src/validateInput.js';

function makeWebpBuffer(): Buffer {
  // RIFF + 4 bytes size + WEBP = 12 bytes minimum
  const buf = Buffer.alloc(16);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(8, 4);  // arbitrary file size
  buf.write('WEBP', 8, 'ascii');
  return buf;
}

describe('validateWebpMagicBytes', () => {
  it('accepts valid RIFF...WEBP magic bytes', () => {
    const buf = makeWebpBuffer();
    const result = validateWebpMagicBytes(buf);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects file starting with non-RIFF bytes', () => {
    const buf = makeWebpBuffer();
    buf.write('PNG\x0D', 0, 'ascii');  // PNG header instead
    const result = validateWebpMagicBytes(buf);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not a valid WebP');
  });

  it('rejects file with RIFF header but wrong format (not WEBP)', () => {
    const buf = makeWebpBuffer();
    buf.write('WAVE', 8, 'ascii');  // WAV audio instead of WEBP
    const result = validateWebpMagicBytes(buf);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('not a valid WebP');
  });

  it('rejects buffer that is too short', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46]);  // only 'RIFF', less than 12 bytes
    const result = validateWebpMagicBytes(buf);
    expect(result.valid).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('accepts file within size limit', () => {
    const result = validateFileSize(10 * 1024 * 1024, 20);  // 10MB, limit 20MB
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects file exceeding size limit', () => {
    const result = validateFileSize(25 * 1024 * 1024, 20);  // 25MB, limit 20MB
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('accepts file exactly at size limit', () => {
    const result = validateFileSize(20 * 1024 * 1024, 20);  // exactly 20MB
    expect(result.valid).toBe(true);
  });
});
