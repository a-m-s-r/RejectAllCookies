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
