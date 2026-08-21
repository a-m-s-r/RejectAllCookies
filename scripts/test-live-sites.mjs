import { chromium } from '@playwright/test';
import path from 'node:path';

const configuredSites = [
  ['Didomi sandbox', 'https://sandbox.didomi.io/cmp.html'],
  ['OneTrust', 'https://www.onetrust.com/products/cookie-consent/'],
  ['Cookiebot', 'https://www.cookiebot.com/en/developer/'],
  ['The Guardian', 'https://www.theguardian.com/international'],
  ['Daily Mail', 'https://www.dailymail.co.uk/home/index.html'],
];
const sites = process.env.LIVE_SITE
  ? configuredSites.filter(([name]) =>
      name.toLocaleLowerCase().includes(process.env.LIVE_SITE.toLocaleLowerCase()),
    )
  : configuredSites;

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
let residualCount = 0;

for (const [name, url] of sites) {
  const page = await context.newPage();
  page.on('dialog', (dialog) => void dialog.accept());
  let navigation = 'loaded';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(name === 'Didomi sandbox' ? 45_000 : 20_000);
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
  const residualSurfaces = [];
  const residualControls = [];
  for (const frame of page.frames()) {
    try {
      const residual = await frame.evaluate(() => {
        const roots = [document];
        for (const root of roots) {
          for (const element of root.querySelectorAll('*')) {
            if (element.shadowRoot) roots.push(element.shadowRoot);
          }
        }
        return roots.flatMap((root) =>
          [
            ...root.querySelectorAll(
              '#didomi-popup, #didomi-notice, [data-testid="dialog-purposes"], [data-testid="dialog-vendors"], #onetrust-banner-sdk, #onetrust-pc-sdk, #CybotCookiebotDialog, #usercentrics-root [role="dialog"], [data-testid="uc-default-ui"]',
            ),
          ]
            .sort((left, right) => Number(/save/iu.test(right.id)) - Number(/save/iu.test(left.id)))
            .filter((element) => {
              if (!(element instanceof HTMLElement)) return false;
              const style = getComputedStyle(element);
              return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((element) => `${element.tagName.toLowerCase()}#${element.id}`),
        );
      });
      residualSurfaces.push(...residual);
      if (residual.length > 0) {
        const controls = await frame.evaluate(() =>
          [
            ...document.querySelectorAll(
              'button, input, a, [role="button"], [role="radio"], [id*="save" i]',
            ),
          ]
            .filter((element) => {
              const style = getComputedStyle(element);
              return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((element) => ({
              label: (element.getAttribute('aria-label') ?? element.textContent)
                .replace(/\s+/gu, ' ')
                .trim()
                .slice(0, 100),
              checked: element.getAttribute('aria-checked'),
              id: element.id,
            }))
            .filter(({ label }) => label.length > 0)
            .slice(0, 80),
        );
        residualControls.push(...controls);
      }
    } catch {
      // A frame may navigate or detach while its CMP closes.
    }
  }
  unsafeCount += unsafeLabels.length;
  residualCount += residualSurfaces.length;
  console.log(
    JSON.stringify({
      name,
      url,
      navigation,
      clicked: labels,
      unsafe: unsafeLabels,
      residualSurfaces,
      residualControls,
    }),
  );
  await page.close();
}

await context.close();
if (unsafeCount > 0) {
  throw new Error(`Observed ${String(unsafeCount)} unsafe affirmative consent action(s)`);
}
if (residualCount > 0) {
  throw new Error(`Observed ${String(residualCount)} consent surface(s) left visible`);
}
