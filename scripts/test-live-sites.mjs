import { chromium } from '@playwright/test';
import path from 'node:path';

const sites = [
  ['Didomi sandbox', 'https://sandbox.didomi.io/cmp.html'],
  ['Usercentrics demo', 'https://usercentrics.com/product-demo/'],
  ['OneTrust', 'https://www.onetrust.com/products/cookie-consent/'],
  ['Cookiebot', 'https://www.cookiebot.com/en/developer/'],
  ['The Guardian', 'https://www.theguardian.com/international'],
  ['Daily Mail', 'https://www.dailymail.co.uk/home/index.html'],
];

const extensionPath = path.resolve('.output/chrome-mv3');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

await context.addInitScript(() => {
  /** @type {Window & { __minimumConsentClickLabels: string[] }} */
  const trackedWindow = window;
  trackedWindow.__minimumConsentClickLabels = [];
  document.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest(
        'button, [role="button"], input[type="button"], input[type="submit"], a[href]',
      );
      if (!(target instanceof HTMLElement)) return;
      const visibleLabel = target instanceof HTMLInputElement ? target.value : target.textContent;
      const label = target.getAttribute('aria-label') ?? visibleLabel;
      trackedWindow.__minimumConsentClickLabels.push(
        label.replace(/\s+/gu, ' ').trim().slice(0, 120),
      );
    },
    true,
  );
});

const unsafe =
  /\b(?:accept all|accept selected|allow all|allow partners|agree(?: and continue)?|enable all|consent to all)\b/iu;
let unsafeCount = 0;

for (const [name, url] of sites) {
  const page = await context.newPage();
  let navigation = 'loaded';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(8_000);
  } catch (error) {
    navigation = error instanceof Error ? error.message.split('\n')[0] : 'navigation failed';
  }

  const labels = [];
  for (const frame of page.frames()) {
    try {
      const frameLabels = await frame.evaluate(() => {
        /** @type {Window & { __minimumConsentClickLabels?: string[] }} */
        const trackedWindow = window;
        return trackedWindow.__minimumConsentClickLabels?.filter(Boolean) ?? [];
      });
      labels.push(...frameLabels);
    } catch {
      // A frame may navigate or detach while its CMP closes.
    }
  }
  const unsafeLabels = labels.filter((label) => unsafe.test(label));
  unsafeCount += unsafeLabels.length;
  console.log(JSON.stringify({ name, url, navigation, clicked: labels, unsafe: unsafeLabels }));
  await page.close();
}

await context.close();
if (unsafeCount > 0) {
  throw new Error(`Observed ${String(unsafeCount)} unsafe affirmative consent action(s)`);
}
