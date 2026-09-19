import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Match the convention used by @sticker/core and @sticker/worker.
    // Without an explicit include, vitest picks up e2e/*.spec.ts, which belongs
    // to Playwright (`npm run test:e2e`) and throws on test.describe().
    include: ['__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
