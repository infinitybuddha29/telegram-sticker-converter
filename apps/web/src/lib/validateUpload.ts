export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  ext?: string;   // detected extension (e.g., ".webp", ".gif")
  mime?: string;
}

export function validateUpload(buffer: Buffer, filename: string, maxMB: number): UploadValidationResult {
  // Check file size first
  const maxBytes = maxMB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return {
      valid: false,
      error: `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds the ${maxMB}MB limit`,
    };
  }

  if (buffer.length < 12) {
    return { valid: false, error: 'File is too small to be a valid media file' };
  }

  // WebP: bytes[0-3] === 'RIFF' AND bytes[8-11] === 'WEBP'
  const riff = buffer.toString('ascii', 0, 4);
  const webpMarker = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webpMarker === 'WEBP') {
    return { valid: true, ext: '.webp', mime: 'image/webp' };
  }

  // GIF: bytes[0-5] === 'GIF87a' or 'GIF89a'
  if (buffer.length >= 6) {
    const gifHeader = buffer.toString('ascii', 0, 6);
    if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
      return { valid: true, ext: '.gif', mime: 'image/gif' };
    }
  }

  // MP4: bytes[4-7] === 'ftyp'
  if (buffer.length >= 8) {
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp') {
      return { valid: true, ext: '.mp4', mime: 'video/mp4' };
    }
  }

  // WebM: bytes[0-3] === 0x1A 0x45 0xDF 0xA3 (EBML magic bytes)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, ext: '.webm', mime: 'video/webm' };
  }

  return {
    valid: false,
    error: 'Unsupported file type. Please upload a WebP, GIF, MP4, or WebM file.',
  };
}
