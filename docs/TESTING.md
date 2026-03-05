# Testing Strategy

## Test Pyramid

```
    ┌─────────┐
    │  E2E    │  Playwright (1-3 tests)
    │ (slow)  │
    ├─────────┤
    │  API    │  Supertest / fetch (5-8 tests)
    │ Integ.  │
    ├─────────┤
    │  FFmpeg │  Real ffmpeg (4-6 tests, needs fixtures)
    │ Integ.  │
    ├─────────┤
    │  Unit   │  Vitest, fast, no I/O (15-20 tests)
    │ (fast)  │
    └─────────┘
```

## 1. Unit Tests (packages/core)

Framework: **Vitest**

### telegramSpec.test.ts
Tests for the spec validation function that checks OutputMeta against Telegram rules.

```
- accepts valid 512x384 VP9 webm (no audio, 2.5s, 200KB)
- accepts valid 384x512 portrait
- accepts valid 512x512 square
- rejects 513x512 (too wide)
- rejects 511x384 (no side is 512)
- rejects odd dimensions (511x383)
- rejects duration > 3.0s
- rejects fps > 30
- rejects file size > 256KB (262144 bytes)
- rejects when has audio
- rejects h264 codec
- rejects mp4 container
- returns individual check results
```

### ffmpegArgs.test.ts
Tests for argument builder (no ffmpeg execution).

```
- generates correct two-pass args for landscape with alpha
- generates correct args for portrait source
- generates correct args for square source
- uses yuv420p when no alpha
- uses yuva420p when alpha detected
- sets -auto-alt-ref 0 only with alpha
- respects custom CRF value
- respects custom FPS value
- respects custom scale max
- calculates correct target bitrate from duration
```

### strategy.test.ts
Tests for the iterative encoding strategy logic.

```
- returns initial strategy for 2s source
- returns initial strategy for 3s+ source (clamps to 3s)
- getNextStrategy: increases CRF when size too large
- getNextStrategy: reduces FPS after CRF maxed out
- getNextStrategy: reduces scale after FPS minimized
- getNextStrategy: returns null when all options exhausted
- calculates correct bitrate with margin
```

### ffprobe.test.ts
Tests for metadata parsing (mock ffprobe output).

```
- parses standard video stream metadata
- detects alpha from yuva420p pix_fmt
- detects alpha from rgba pix_fmt
- handles 0/0 frame rate (returns fallback)
- calculates fps from duration and nb_frames as fallback
- handles missing duration gracefully
```

## 2. Integration Tests with FFmpeg (packages/core)

Framework: **Vitest** with `--timeout 30000`

These tests run real ffmpeg/ffprobe on fixture files.

### Test Fixtures Needed

Create/find small animated WebP files:

| Fixture File          | Properties                                          |
|-----------------------|-----------------------------------------------------|
| `alpha_short.webp`    | Transparent, < 3s, ~400x400, simple animation       |
| `alpha_long.webp`     | Transparent, > 3s (5s), ~400x400                    |
| `opaque.webp`         | No transparency, < 3s, ~400x400                     |
| `large_dims.webp`     | Transparent, < 3s, 800x600                          |
| `portrait.webp`       | Transparent, < 3s, 300x500                          |
| `heavy.webp`          | Many frames, complex animation (hard to compress)   |

**How to create fixtures:**
```bash
# Option 1: Use ffmpeg to create a test animated webp
ffmpeg -f lavfi -i "color=c=red@0.5:s=400x400:d=2,format=yuva420p" \
  -vf "drawtext=text='%{n}':fontsize=48:fontcolor=white:x=10:y=10" \
  -loop 0 -lossless 0 -quality 75 \
  fixtures/alpha_short.webp

# Option 2: Find real sticker webp files from public sticker packs
```

### Integration Test Cases

```
pipeline.integration.test.ts:
- converts alpha_short.webp → valid Telegram sticker
  - output is .webm
  - codec is VP9
  - no audio
  - one side is 512px
  - duration ≤ 3.0s
  - fps ≤ 30
  - size ≤ 256KB

- trims alpha_long.webp to ≤ 3 seconds

- handles large_dims.webp (scales down correctly)

- handles portrait.webp (height=512, width proportional)

- handles heavy.webp (iterates to fit 256KB, may reduce quality)

- preserves transparency in alpha source

- uses yuv420p for opaque source
```

## 3. API Integration Tests (apps/web)

Framework: **Vitest** or **node:test** with `fetch`

Requires: Redis running, worker running (or use in-process worker for tests).

```
api.integration.test.ts:
- POST /api/jobs with valid webp → returns 201 + jobId
- POST /api/jobs with no file → returns 400
- POST /api/jobs with non-webp → returns 400
- POST /api/jobs with file > 20MB → returns 400
- GET /api/jobs/:id with valid id → returns job status
- GET /api/jobs/:id with invalid id → returns 404
- GET /api/jobs/:id/download before done → returns 404
- Full flow: upload → poll until done → download → file is valid webm
```

## 4. E2E Tests (Playwright)

```
e2e/converter.spec.ts:
- shows upload dropzone on page load
- uploads fixture → shows processing status → shows "Ready" → download works
- shows error for non-webp file
- shows Telegram checklist with all green checks on success
```

## Running Tests

```bash
# All unit tests (fast, no external deps)
npm run test -w packages/core

# Integration tests (needs ffmpeg installed)
npm run test:integration -w packages/core

# API tests (needs Redis + worker)
docker compose -f docker/docker-compose.yml up -d
npm run test -w apps/web

# E2E (needs full stack running)
npm run dev -w apps/web &
npm run dev -w apps/worker &
npx playwright test
```

## CI Considerations
- Unit tests: run always (no deps)
- Integration tests: need ffmpeg in CI image (use `jrottenberg/ffmpeg` Docker image)
- API tests: need Redis service
- E2E: need full stack + headless browser
