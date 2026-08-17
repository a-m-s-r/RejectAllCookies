import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CMP_ADAPTERS } from '../../src/cmp/registry';

const fixtures: readonly (readonly [string, string])[] = [
  [
    'onetrust',
    '<div id="onetrust-banner-sdk"><button id="onetrust-reject-all-handler">Reject all</button></div>',
  ],
  [
    'cookiebot',
    '<div id="CybotCookiebotDialog"><button id="CybotCookiebotDialogBodyButtonDecline">Decline</button></div>',
  ],
  [
    'didomi',
    '<div id="didomi-notice"><button id="didomi-notice-disagree-button">Continue without accepting</button></div>',
  ],
  [
    'quantcast',
    '<div class="qc-cmp2-container"><button data-testid="reject-all">Reject all</button></div>',
  ],
  [
    'cookieyes',
    '<div class="cky-consent-container"><button data-cky-tag="reject-button">Reject all</button></div>',
  ],
  [
    'sourcepoint',
    '<div class="message-component"><button class="sp_choice_type_REJECT_ALL">Reject all</button></div>',
  ],
  [
    'google-funding-choices',
    '<div class="fc-consent-root"><button class="fc-cta-do-not-consent">Do not consent</button></div>',
  ],
  ['complianz', '<div class="cmplz-cookiebanner"><button class="cmplz-deny">Deny</button></div>'],
  [
    'iubenda',
    '<div id="iubenda-cs-banner"><button class="iubenda-cs-reject-btn">Reject</button></div>',
  ],
];

describe('dedicated CMP adapters', () => {
  beforeEach(() => document.body.replaceChildren());
  it.each(fixtures)('%s plans only its reject action', (id, markup) => {
    document.body.innerHTML = markup;
    const adapter = CMP_ADAPTERS.find((candidate) => candidate.id === id);
    const surface = adapter?.detect(document);
    expect(surface).not.toBeNull();
    expect(surface && adapter?.plan(surface)?.intent).toBe('rejectAll');
  });
  it('detects Usercentrics inside its open shadow root', () => {
    const host = document.createElement('div');
    host.id = 'usercentrics-root';
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div role="dialog"><button data-testid="uc-deny-all-button">Deny all</button></div>';
    const click = vi.fn();
    shadow.querySelector('button')?.addEventListener('click', click);
    const adapter = CMP_ADAPTERS.find((candidate) => candidate.id === 'usercentrics');
    const surface = adapter?.detect(document);
    expect(surface && adapter?.plan(surface)?.intent).toBe('rejectAll');
  });
  it('ignores a hidden stale OneTrust layer in favour of the visible preferences layer', () => {
    document.body.innerHTML =
      '<div id="onetrust-banner-sdk" style="display:none"><button id="onetrust-reject-all-handler">Reject all</button></div><div id="onetrust-pc-sdk"><button class="ot-pc-refuse-all-handler">Reject all</button></div>';
    const adapter = CMP_ADAPTERS.find((candidate) => candidate.id === 'onetrust');
    const surface = adapter?.detect(document);
    expect(surface?.root.id).toBe('onetrust-pc-sdk');
    expect(surface && adapter?.plan(surface)?.target).toBe(
      document.querySelector('.ot-pc-refuse-all-handler'),
    );
  });
  it('does not plan a hidden Usercentrics reject control', () => {
    const host = document.createElement('div');
    host.id = 'usercentrics-root';
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div role="dialog"><button style="display:none" data-testid="uc-deny-all-button">Deny all</button><button data-testid="uc-more-button">Settings</button></div>';
    const adapter = CMP_ADAPTERS.find((candidate) => candidate.id === 'usercentrics');
    const surface = adapter?.detect(document);
    expect(surface && adapter?.plan(surface)?.intent).toBe('openPreferences');
  });
});
