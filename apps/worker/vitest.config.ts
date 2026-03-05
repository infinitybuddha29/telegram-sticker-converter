import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 60000,  // 60s for ffmpeg operations
  },
});
