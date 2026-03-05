FROM node:22-slim AS base
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/web ./apps/web
COPY apps/worker ./apps/worker

# Build in order: core → web → worker
RUN npm run build -w @sticker/core
RUN npm run build -w @sticker/web
RUN npm run build -w @sticker/worker

# Start both web and worker in one container
COPY start.sh ./
RUN chmod +x start.sh
EXPOSE 3000
CMD ["./start.sh"]
