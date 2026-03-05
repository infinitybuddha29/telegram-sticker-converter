# Telegram Sticker Converter

## Project Overview
Web service that converts animated WebP files to Telegram-ready WebM video stickers (VP9, no audio, <=256KB, <=3sec, 512px).

## Tech Stack
- **Runtime**: Node.js 22 + TypeScript 5
- **Framework**: Next.js 15 (App Router) — UI + API routes
- **Queue**: BullMQ + Redis (via Docker)
- **Video**: ffmpeg 7.1 (libvpx-vp9) + ffprobe
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Package manager**: npm workspaces (monorepo)
- **Styling**: Tailwind CSS 4 + shadcn/ui

## Directory Structure
```
/
├── CLAUDE.md                    # This file
├── package.json                 # Root workspace config
├── tsconfig.base.json           # Shared TS config
├── apps/
│   ├── web/                     # Next.js app (UI + API routes)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages & API routes
│   │   │   │   ├── api/jobs/    # POST, GET /:id, GET /:id/download
│   │   │   │   └── page.tsx     # Main converter page
│   │   │   ├── components/      # React components
│   │   │   └── lib/             # Client-side helpers
│   │   └── package.json
│   └── worker/                  # BullMQ job processor
│       ├── src/
│       │   ├── index.ts         # Worker entry point
│       │   └── processJob.ts    # Main job processing pipeline
│       └── package.json
├── packages/
│   └── core/                    # Shared logic (spec, ffmpeg, types)
│       ├── src/
│       │   ├── types.ts         # Shared types (JobStatus, OutputMeta, etc.)
│       │   ├── telegramSpec.ts  # Validation rules
│       │   ├── ffprobe.ts       # Metadata extraction
│       │   ├── ffmpegArgs.ts    # FFmpeg argument builder
│       │   └── strategy.ts     # Iterative encoding strategy
│       ├── __tests__/           # Unit tests
│       └── package.json
├── docker/
│   └── docker-compose.yml       # Redis (+ optionally full stack)
├── fixtures/                    # Test fixtures (animated webp files)
└── docs/                        # Detailed documentation
    ├── ARCHITECTURE.md
    ├── TELEGRAM_SPEC.md
    ├── FFMPEG_PIPELINE.md
    ├── API_CONTRACTS.md
    └── TESTING.md
```

## Key Conventions
- All source code in TypeScript with strict mode
- Use `import type` for type-only imports
- Error messages: human-readable in API responses, raw stderr saved in job metadata
- File paths: always use `path.join()`, never string concat. Validate no `..` in filenames
- Temp files: each job gets `./data/jobs/{jobId}/` directory (uuid-based)
- Config: environment variables via `.env` (not committed)

## Commands
```bash
# Development
npm install                      # Install all workspace deps
docker compose -f docker/docker-compose.yml up -d  # Start Redis
npm run dev -w apps/web          # Start Next.js dev server
npm run dev -w apps/worker       # Start worker in watch mode

# Testing
npm run test -w packages/core    # Unit tests (fast, no ffmpeg)
npm run test:integration -w packages/core  # Integration tests (needs ffmpeg)
npm run test -w apps/web         # API tests
npx playwright test              # E2E tests

# Build
npm run build -w packages/core
npm run build -w apps/web
npm run build -w apps/worker
```

## Critical Rules
1. **Never trust filenames** — sanitize all uploaded filenames, use uuid for storage
2. **256KB is hard limit** — the encoding pipeline MUST guarantee output ≤ 256KB
3. **Temp cleanup** — always clean up temp files, even on error (use try/finally)
4. **No secrets in code** — Redis URL, etc. come from env vars
5. **Validate input** — check magic bytes (RIFF...WEBP), not just extension/MIME

## Reference Docs
- `docs/ARCHITECTURE.md` — System architecture and data flow
- `docs/TELEGRAM_SPEC.md` — Telegram video sticker requirements
- `docs/FFMPEG_PIPELINE.md` — FFmpeg encoding pipeline details
- `docs/API_CONTRACTS.md` — API request/response contracts
- `docs/TESTING.md` — Test strategy and fixture descriptions
