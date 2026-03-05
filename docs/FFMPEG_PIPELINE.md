# FFmpeg Encoding Pipeline

## Overview

The encoding uses VP9 two-pass encoding for best quality-to-size ratio.
If the output exceeds 256KB, we iteratively reduce bitrate, fps, and scale.

## Phase 1: Probe Input

```bash
ffprobe -v quiet -print_format json -show_streams -show_format input.webp
```

Key values to extract:
- `width`, `height` — source dimensions
- `duration` — total duration (may be in format.duration for animated webp)
- `r_frame_rate` or `avg_frame_rate` — frame rate (WARNING: may be `0/0` for animated webp)
- `nb_frames` — frame count
- `codec_name` — should be `webp`
- `pix_fmt` — check for alpha: `yuva420p`, `rgba`, `ya8`, `pal8` indicate transparency

### Animated WebP FPS Detection Fallback
If ffprobe returns `0/0` for frame rate:
1. Try: `duration / nb_frames` to calculate fps
2. If duration is also 0: assume 24fps (common for animated webp stickers)
3. Clamp result to range [1, 30]

## Phase 2: Calculate Strategy

```typescript
interface EncodingStrategy {
  targetBitrate: number;  // kbps
  fps: number;            // ≤ 30
  scaleMax: number;       // longest side, default 512
  crf: number;            // quality (lower=better, 20-50)
  hasAlpha: boolean;      // determines pix_fmt
  duration: number;       // ≤ 3.0
}
```

Initial values:
```
duration = min(sourceDuration, 3.0)
fps = min(sourceFps, 30)
targetBitrate = floor((256 * 1024 * 8) / duration * 0.92)  // 8% margin for container overhead
scaleMax = 512
crf = 30  // starting quality
hasAlpha = detected from source
```

## Phase 3: Two-Pass VP9 Encode

### Pass 1 (analysis):
```bash
ffmpeg -y -i input.webp \
  -t 3 \
  -vf "fps=30,scale=512:-2:force_original_aspect_ratio=decrease" \
  -pix_fmt yuva420p \
  -c:v libvpx-vp9 \
  -b:v {targetBitrate}k \
  -minrate {targetBitrate*0.5}k \
  -maxrate {targetBitrate*1.5}k \
  -crf {crf} \
  -auto-alt-ref 0 \
  -deadline good \
  -cpu-used 2 \
  -an \
  -pass 1 \
  -passlogfile /tmp/{jobId}_vpx \
  -f null /dev/null
```

### Pass 2 (encode):
```bash
ffmpeg -y -i input.webp \
  -t 3 \
  -vf "fps=30,scale=512:-2:force_original_aspect_ratio=decrease" \
  -pix_fmt yuva420p \
  -c:v libvpx-vp9 \
  -b:v {targetBitrate}k \
  -minrate {targetBitrate*0.5}k \
  -maxrate {targetBitrate*1.5}k \
  -crf {crf} \
  -auto-alt-ref 0 \
  -deadline good \
  -cpu-used 2 \
  -an \
  -pass 2 \
  -passlogfile /tmp/{jobId}_vpx \
  output.webm
```

### Scale filter explanation
- `scale=512:-2:force_original_aspect_ratio=decrease`
  - `512:-2` = width 512, height auto (even number via `-2`)
  - `force_original_aspect_ratio=decrease` = don't upscale beyond source
  - For portrait: swap to `scale=-2:512:force_original_aspect_ratio=decrease`
  - Decision: if `width >= height` → scale width to 512, else scale height to 512

### Actually correct scale filter
```
scale='if(gte(iw,ih),512,-2)':'if(gte(iw,ih),-2,512)':force_original_aspect_ratio=decrease
```
This picks which side gets 512 based on aspect ratio.

## Phase 4: Size Check & Iteration

After each encode, check output file size:

```typescript
const MAX_SIZE = 256 * 1024; // 262144 bytes

if (outputSize <= MAX_SIZE) {
  // Success!
  return;
}

// Iteration strategy (in order):
// 1. Increase CRF (lower quality): 30 → 34 → 38 → 42 → 46
// 2. Reduce FPS: 30 → 24 → 20 → 15
// 3. Reduce scale: 512 → 480 → 448 → 384
// Each change triggers a new two-pass encode
```

Max iterations: 5 total. If still > 256KB after 5 iterations, mark job as failed with error "Could not fit within 256KB limit".

## Phase 5: Verify Output

```bash
ffprobe -v quiet -print_format json -show_streams -show_format output.webm
```

Check all Telegram requirements (see telegramSpec.ts).

## Important Notes

### `-auto-alt-ref 0`
Required for alpha transparency. Alt-ref frames don't support alpha channel.
If source has no alpha, can omit this for better compression.

### `-deadline good` vs `-deadline best`
`best` = slower but better compression. For our use case (small files, need to fit in 256KB),
`good` with `-cpu-used 2` is a good balance of speed vs quality.

### Container overhead
WebM container adds ~2-5% overhead. The 8% margin in bitrate calculation accounts for this.

### Animated WebP quirks
- ffmpeg treats animated webp as a video stream
- Frame timing may be variable (not constant fps)
- Some animated webp files report incorrect duration
- Always verify with ffprobe after conversion

### Pass log files
Two-pass creates temporary log files. Clean up `{jobId}_vpx-0.log` after encoding.
Use unique prefix per job to avoid collisions.
