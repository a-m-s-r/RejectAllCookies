import { expect, test } from './fixtures';

test('rejects a dynamically inserted banner without accepting and persists on reload', async ({
  page,
}: {
  page: any;
}) => {
  await page.goto('http://127.0.0.1:4173/dynamic');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('choice'))).toBe('rejected');
  await expect(page.locator('#accept-marker')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('popup exposes local controls and a truthful status', async ({
  page,
  extensionId,
}: {
  page: any;
  extensionId: string;
}) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading', { name: 'Minimum Consent' })).toBeVisible();
  await expect(page.getByText('Automatic rejection')).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    /No consent result|Rejected|handling|failed/u,
  );
});
