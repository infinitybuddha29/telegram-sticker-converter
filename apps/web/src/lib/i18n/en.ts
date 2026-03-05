export type Dictionary = {
  meta: { title: string; description: string };
  header: { title: string; subtitle: string; requirements: string };
  dropzone: { title: string; subtitle: string; supports: string; errorType: string; errorSize: string };
  status: { converting: string; conversionFailed: string; uploading: string; queued: string; encoding: string; ready: string; failedLabel: string };
  checklist: { title: string; allPassed: string; someFailed: string; webm: string; vp9: string; noAudio: string; fps: string; duration: string; size: string; dimensions: string };
  result: { title: string; telegramReady: string; download: string; fileSize: string; dimensions: string; duration: string; fps: string; codec: string; alpha: string; alphaYes: string; alphaNo: string; convertAnother: string };
  error: { title: string; tryAgain: string; lostConnection: string; uploadFailed: string };
  footer: string;
};

export const en: Dictionary = {
  meta: {
    title: 'Telegram Sticker Converter',
    description:
      'Convert animated WebP, GIF, and MP4 to Telegram-ready VP9 WebM video stickers. Free, no account required. Max 256KB, 3 seconds, 512px.',
  },
  header: {
    title: 'Telegram Sticker Converter',
    subtitle: 'Convert animated files to Telegram-ready VP9 WebM stickers',
    requirements: 'Telegram requirements',
  },
  dropzone: {
    title: 'Drop your animated file here',
    subtitle: 'or click to browse',
    supports: 'Supports: animated .webp, .gif, .mp4, .mov, .webm \u2022 Max 20MB',
    errorType: 'Unsupported file type "{ext}". Please use: .webp, .gif, .mp4, .mov, .webm',
    errorSize: 'File is too large. Maximum size is {size}MB.',
  },
  status: {
    converting: 'Converting\u2026',
    conversionFailed: 'Conversion Failed',
    uploading: 'Uploading',
    queued: 'Queued',
    encoding: 'Encoding',
    ready: 'Ready',
    failedLabel: 'Failed',
  },
  checklist: {
    title: 'Telegram Compliance',
    allPassed: 'All checks passed',
    someFailed: 'Some checks failed',
    webm: 'WebM container',
    vp9: 'VP9 codec',
    noAudio: 'No audio track',
    fps: 'FPS \u2264 30',
    duration: 'Duration \u2264 3.0s',
    size: 'Size \u2264 256KB',
    dimensions: 'Dimensions (one side = 512px)',
  },
  result: {
    title: 'Result',
    telegramReady: 'Telegram Ready',
    download: 'Download WebM Sticker',
    fileSize: 'File Size',
    dimensions: 'Dimensions',
    duration: 'Duration',
    fps: 'FPS',
    codec: 'Codec',
    alpha: 'Alpha',
    alphaYes: 'Yes',
    alphaNo: 'No',
    convertAnother: 'Convert another file',
  },
  error: {
    title: 'Conversion failed',
    tryAgain: 'Try again',
    lostConnection: 'Lost connection. Please try again.',
    uploadFailed: 'Upload failed. Please try again.',
  },
  footer: 'No account required. Files automatically deleted after 24 hours.',
};
