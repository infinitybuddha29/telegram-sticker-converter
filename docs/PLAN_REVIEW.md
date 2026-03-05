# Plan Review — Issues Found and Fixes Applied

## Critical Issues

### 1. 512×512 Padding is Wasteful (FIXED)
**Plan said:** "всегда 512×512 canvas с прозрачным pad"
**Problem:** Telegram requires "one side = 512, other ≤ 512". Padding to 512×512 adds empty pixels, wasting bytes critical for the 256KB limit.
**Fix:** Scale longest side to 512, preserve aspect ratio. Optional "Force 512×512" toggle for users who want it.

### 2. No Two-Pass Encoding (FIXED)
**Plan said:** Use CRF iteration only (CRF 32 → 34 → 36...)
**Problem:** CRF gives unpredictable file sizes. Multiple full re-encodes are slow.
**Fix:** Use VP9 two-pass encoding with calculated target bitrate. Falls back to CRF increase only if still over 256KB.

### 3. `color=black@0` Syntax (FIXED)
**Plan said:** `pad=512:512:...:color=black@0`
**Problem:** Alpha in color notation varies by ffmpeg version. May not work.
**Fix:** Don't pad by default. If padding needed, use `format=yuva420p` before pad with explicit `color=0x00000000`.

## Important Issues

### 4. Animated WebP FPS Detection
**Plan didn't mention.** ffprobe may return `0/0` for animated webp frame rates.
**Fix:** Added fallback: calculate from `duration / nb_frames`, default to 24fps if both missing.

### 5. No Magic Byte Validation
**Plan said:** Just check MIME type.
**Problem:** MIME type can be spoofed. Need to verify file starts with `RIFF....WEBP`.
**Fix:** Added magic byte check: bytes 0-3 = `RIFF`, bytes 8-11 = `WEBP`.

### 6. Missing Shell Injection Prevention
**Plan didn't mention.**
**Fix:** Use `child_process.execFile` instead of `exec` for all ffmpeg/ffprobe calls. Never interpolate user input into shell commands.

### 7. No Polling Strategy
**Plan mentioned UI polling but no details.**
**Fix:** Poll `GET /api/jobs/:id` every 1 second. Can upgrade to SSE later.

## Minor Issues

### 8. Package Manager Not Specified
**Fix:** Using npm workspaces (already available, no extra install needed).

### 9. Pass Log File Collisions
If multiple ffmpeg instances run, pass log files could collide.
**Fix:** Use `{jobId}` prefix for pass log files.

### 10. Missing CORS Discussion
**Fix:** Next.js API routes are same-origin by default, no CORS config needed for MVP.

## Preserved from Plan (Good Decisions)
- BullMQ + Redis queue (correct for CPU-heavy ffmpeg work)
- Worker as separate process
- Job timeout (120s)
- File TTL (24h auto-delete)
- UUID-based job directories
- Rate limiting on IP
- Monorepo structure with shared core package
