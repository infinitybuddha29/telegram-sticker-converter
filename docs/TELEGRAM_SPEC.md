# Telegram Video Sticker Specification

Source: https://core.telegram.org/stickers/webm-vp9-spec

## Requirements

| Property      | Requirement                          | How we ensure it            |
|---------------|--------------------------------------|-----------------------------|
| Container     | WebM (.webm)                         | ffmpeg `-f webm`            |
| Video codec   | VP9                                  | `-c:v libvpx-vp9`          |
| Audio         | No audio stream                      | `-an`                       |
| Duration      | ≤ 3.0 seconds                        | `-t 3`                      |
| FPS           | ≤ 30 fps                             | `fps=min(src,30)` filter    |
| File size     | ≤ 256 KB (262144 bytes)              | Two-pass + iterative reduce |
| Dimensions    | One side exactly 512px, other ≤512px | Scale filter                |
| Looping       | Should loop seamlessly (aesthetic)   | Not enforced by Telegram    |

## Dimension Rules (Important!)

Telegram says: "One side must be exactly 512 pixels, the other side can be 512 pixels or less."

**NOT always 512×512.** The plan suggested padding to 512×512 for safety, but this:
- Wastes bytes on transparent padding (critical with 256KB limit)
- Can make non-square content look awkward

**Our strategy:**
1. Determine source aspect ratio
2. Scale so the **longest side = 512px**, shortest side proportional (≤512)
3. Round shortest side to even number (required by VP9 yuva420p)
4. No padding by default
5. Optional "Force 512×512" setting (pads with transparent pixels)

### Examples
| Source    | Output    | Logic                              |
|-----------|-----------|-------------------------------------|
| 400×400   | 512×512   | Both sides scaled up to 512         |
| 800×600   | 512×384   | Longest=512, shortest=384 (even)    |
| 200×500   | 204×512   | Longest=512, shortest=204 (→even)   |
| 1920×1080 | 512×288   | Longest=512, shortest=288           |

## Alpha/Transparency

- Pixel format: `yuva420p` (YUV 4:2:0 with alpha plane)
- Requires `-auto-alt-ref 0` for VP9 (alt-ref frames don't support alpha)
- Animated WebP with transparency → preserved in output
- If source has no alpha → use `yuv420p` instead (smaller file)

## What Telegram Rejects (common issues)
1. Audio stream present (even silent) → use `-an`
2. Wrong codec (H.264 instead of VP9)
3. File > 256KB
4. Duration > 3 seconds
5. Neither side is 512px
6. Odd dimension numbers (VP9 needs even)
