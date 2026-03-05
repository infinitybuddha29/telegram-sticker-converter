#!/bin/bash
set -e

mkdir -p "${DATA_DIR:-/data}/jobs"

# Start worker in background
node apps/worker/dist/index.js &
WORKER_PID=$!

# Start Next.js (Railway injects PORT automatically, Next.js reads it)
npm run start -w @sticker/web &
WEB_PID=$!

echo "Started worker (PID $WORKER_PID) and web (PID $WEB_PID)"

# Exit if either process dies
wait -n
EXIT_CODE=$?
echo "A process exited with code $EXIT_CODE, shutting down..."
kill $WORKER_PID $WEB_PID 2>/dev/null || true
exit $EXIT_CODE
