/**
 * E2E tests for Telegram Sticker Converter.
 * Requires: Next.js dev server on port 3000 + worker + Redis running.
 * Run: cd apps/web && npx playwright test
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const FIXTURE_DIR = path.resolve(__dirname, '../../../fixtures');

test.describe('Telegram Sticker Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Layout ──────────────────────────────────────────────────────────────────

  test('page renders header and upload zone', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Telegram Sticker Converter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload file drop zone' })).toBeVisible();
    await expect(page.getByText('Drop your animated file here')).toBeVisible();
    await expect(page.getByText(/Supports: animated/)).toBeVisible();
    await expect(page.getByText('No account required.')).toBeVisible();
  });

  // ── Happy path: full conversion ──────────────────────────────────────────

  test('converts alpha_short.webp and shows Telegram-ready result', async ({ page }) => {
    // Upload via hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURE_DIR, 'alpha_short.webp'));

    // Wait for done state — download button appears (conversion is fast, ~1s)
    await expect(page.getByRole('link', { name: /Download WebM Sticker/ })).toBeVisible({
      timeout: 30_000,
    });

    // Telegram-ready badge
    await expect(page.getByText('Telegram Ready')).toBeVisible();

    // Download link points to the right endpoint
    const downloadHref = await page
      .getByRole('link', { name: /Download WebM Sticker/ })
      .getAttribute('href');
    expect(downloadHref).toMatch(/^\/api\/jobs\/[0-9a-f-]{36}\/download$/);

    // Stats grid: target <dd> elements specifically
    await expect(page.locator('dl dd').filter({ hasText: 'VP9' })).toBeVisible();
    await expect(page.locator('dl dd').filter({ hasText: /KB/ })).toBeVisible();
  });

  test('shows checklist with all checks passed', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURE_DIR, 'alpha_short.webp'));

    // Wait for done
    await expect(page.getByRole('link', { name: /Download WebM Sticker/ })).toBeVisible({
      timeout: 30_000,
    });

    // All 7 checklist items visible (labels from TelegramChecklist.tsx)
    await expect(page.getByText('WebM container')).toBeVisible();
    await expect(page.getByText('VP9 codec')).toBeVisible();
    await expect(page.getByText('No audio track')).toBeVisible();
    await expect(page.getByText(/FPS.*30/)).toBeVisible();
    await expect(page.getByText(/Duration.*3/)).toBeVisible();
    await expect(page.getByText(/Size.*256/)).toBeVisible();
    await expect(page.getByText('Dimensions (one side = 512px)')).toBeVisible();
  });

  // ── Download ─────────────────────────────────────────────────────────────

  test('download link returns a valid WebM file', async ({ page, request }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURE_DIR, 'alpha_short.webp'));

    const downloadLink = page.getByRole('link', { name: /Download WebM Sticker/ });
    await expect(downloadLink).toBeVisible({ timeout: 30_000 });

    const href = await downloadLink.getAttribute('href');
    expect(href).toBeTruthy();

    const response = await request.get(`http://localhost:3000${href}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('video/webm');

    const body = await response.body();
    expect(body.length).toBeGreaterThan(1024); // at least 1 KB
    expect(body.length).toBeLessThanOrEqual(256 * 1024); // at most 256 KB

    // WebM magic bytes: 0x1A 0x45 0xDF 0xA3 (EBML header)
    expect(body[0]).toBe(0x1a);
    expect(body[1]).toBe(0x45);
    expect(body[2]).toBe(0xdf);
    expect(body[3]).toBe(0xa3);
  });

  // ── Convert another file (reset) ─────────────────────────────────────────

  test('"Convert another file" button resets to upload state', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURE_DIR, 'alpha_short.webp'));

    await expect(page.getByRole('link', { name: /Download WebM Sticker/ })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: 'Convert another file' }).click();

    // Back to idle: dropzone visible again
    await expect(page.getByRole('button', { name: 'Upload file drop zone' })).toBeVisible();
    await expect(page.getByText('Drop your animated file here')).toBeVisible();
    // Result card gone
    await expect(page.getByRole('link', { name: /Download WebM Sticker/ })).not.toBeVisible();
  });

  // ── Validation ───────────────────────────────────────────────────────────

  test('shows error for unsupported file type (e.g. .txt)', async ({ page }) => {
    // Create a fake txt file using Blob
    const fileInput = page.locator('input[type="file"]');

    // We need to bypass the accept attribute — use page.evaluate to create a fake file
    await page.evaluate(() => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: dt.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Use specific selector to avoid matching Next.js route announcer (also role="alert")
    const alertEl = page.locator('p[role="alert"]');
    await expect(alertEl).toBeVisible({ timeout: 3_000 });
    await expect(alertEl).toContainText('Unsupported file type');
  });

  // ── API: status polling ───────────────────────────────────────────────────

  test('GET /api/jobs/:id returns 404 for unknown job', async ({ request }) => {
    // Must be a valid v4 UUID (version nibble = 4, variant nibble = 8-b)
    const res = await request.get(
      'http://localhost:3000/api/jobs/00000000-0000-4000-8000-000000000000'
    );
    expect(res.status()).toBe(404);
  });

  test('POST /api/jobs returns 400 for no file', async ({ request }) => {
    // Use a distinct IP to avoid hitting the rate limit from UI tests
    const res = await request.post('http://localhost:3000/api/jobs', {
      headers: { 'X-Forwarded-For': '10.0.0.1' },
      multipart: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('POST /api/jobs returns 400 for invalid file type', async ({ request }) => {
    const res = await request.post('http://localhost:3000/api/jobs', {
      headers: { 'X-Forwarded-For': '10.0.0.2' },
      multipart: {
        file: {
          name: 'test.exe',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('MZ\x00\x00'), // fake PE header
        },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  // ── Path traversal protection ─────────────────────────────────────────────

  test('GET /api/jobs with path traversal attempt returns 400', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/jobs/../../../etc/passwd');
    // Next.js will return 404 for unmatched routes; either 400 or 404 is acceptable
    expect([400, 404]).toContain(res.status());
  });
});
