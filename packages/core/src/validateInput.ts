export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that a buffer starts with RIFF....WEBP magic bytes.
 *
 * WebP file format:
 *   Bytes 0-3:  'RIFF' (ASCII)
 *   Bytes 4-7:  file size (little-endian uint32) — ignored here
 *   Bytes 8-11: 'WEBP' (ASCII)
 */
export function validateWebpMagicBytes(buffer: Buffer): ValidationResult {
  if (buffer.length < 12) {
    return { valid: false, error: 'File is not a valid WebP image' };
  }

  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);

  if (riff !== 'RIFF' || webp !== 'WEBP') {
    return { valid: false, error: 'File is not a valid WebP image' };
  }

  return { valid: true };
}

/**
 * Validate that a file size is within the allowed maximum.
 *
 * @param sizeBytes - actual file size in bytes
 * @param maxMB     - maximum allowed size in megabytes
 */
export function validateFileSize(sizeBytes: number, maxMB: number): ValidationResult {
  const maxBytes = maxMB * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File size ${(sizeBytes / 1024 / 1024).toFixed(1)}MB exceeds the ${maxMB}MB limit`,
    };
  }
  return { valid: true };
}
