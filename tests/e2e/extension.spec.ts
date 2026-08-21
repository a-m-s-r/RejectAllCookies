import { expect, test } from './fixtures';

test('rejects a dynamically inserted banner without accepting and persists on reload', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4173/dynamic');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('choice'))).toBe('rejected');
  await expect(page.locator('#accept-marker')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('popup exposes local controls and a truthful status', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading', { name: 'Minimum Consent' })).toBeVisible();
  await expect(page.getByText('Automatic rejection')).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    /No consent result|Rejected|handling|failed/u,
  );
});

test('minimizes purposes, vendors, and legitimate interest before saving', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/settings');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('settings-result')))
    .not.toBeNull();
  const result = await page.evaluate(() => localStorage.getItem('settings-result'));
  expect(result).toBe(
    JSON.stringify({
      required: true,
      analytics: false,
      vendor: 'false',
      legitimateInterest: 'false',
    }),
  );
  expect(await page.evaluate(() => localStorage.getItem('unsafe'))).toBeNull();
});

test('crawls layered Usercentrics controls and reports the complete sweep in an alert', async ({
  page,
}) => {
  const summary = new Promise<string>((resolve) => {
    page.once('dialog', (dialog) => {
      resolve(dialog.message());
      void dialog.accept();
    });
  });
  await page.goto('http://127.0.0.1:4173/usercentrics-layered');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('uc-result'))).not.toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('uc-result'))).toBe(
    JSON.stringify({
      required: true,
      analytics: false,
      vendor: 'false',
      legitimateInterest: 'false',
    }),
  );
  expect(await page.evaluate(() => localStorage.getItem('uc-unsafe'))).toBeNull();
  await expect(summary).resolves.toMatch(/Website wanted:/iu);
  for (const requested of [
    'advertising',
    'profiling',
    'measurement/analytics',
    'device identification',
  ]) {
    await expect(summary).resolves.toContain(requested);
  }
  await expect(summary).resolves.toMatch(/blocked 1 active vendor authorization/iu);
  await expect(summary).resolves.toMatch(/objected to 1 legitimate-interest control/iu);
  await expect(summary).resolves.toMatch(/1 locked required control.*remained allowed/iu);
});

test('does not touch login, newsletter, or age-gate controls', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/false-positives');
  await page.waitForTimeout(1_000);
  await expect(page.locator('#remember')).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('unexpected-click'))).toBeNull();
});

test('rejects inside an open shadow root', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/shadow');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('shadow-choice')))
    .toBe('rejected');
});

test('coordinates rejection owned by a child frame', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/iframe');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('frame-choice')))
    .toBe('rejected');
});

test('rearms detection for a delayed SPA route', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('http://127.0.0.1:4173/spa-delayed');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('spa-choice')), { timeout: 40_000 })
    .toBe('rejected');
});
