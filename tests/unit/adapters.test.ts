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
  it('walks Didomi denial radios, the partner layer, and save without selecting agree', () => {
    document.body.innerHTML = `
      <div id="didomi-popup">
        <div data-testid="dialog-purposes">
          <section><span>Advertising profiles</span><button class="didomi-components-radio__option" role="radio" aria-checked="false">Disagree</button><button class="didomi-components-radio__option" role="radio" aria-checked="false">Agree</button></section>
          <button class="didomi-consent-popup-view-vendors-list-link">View our partners</button>
          <button id="btn-toggle-save">Save choices</button>
        </div>
      </div>`;
    const adapter = CMP_ADAPTERS.find((candidate) => candidate.id === 'didomi');
    const surface = adapter?.detect(document);
    if (!surface || !adapter?.planPreferences) throw new Error('Didomi fixture failed');
    const purposeAction = adapter.planPreferences(surface, false, new Set());
    expect(purposeAction?.intent).toBe('disablePurpose');
    expect(purposeAction?.evidence.includes('denial-radio-option')).toBe(true);
    const disagree = document.querySelector<HTMLElement>('button[aria-checked="false"]');
    if (!disagree) throw new Error('Didomi denial fixture failed');
    disagree.setAttribute('aria-checked', 'true');
    const selected = new Set<Element>([disagree]);
    const partnerAction = adapter.planPreferences(surface, false, selected);
    expect(partnerAction?.intent).toBe('openPreferences');
    if (!partnerAction) throw new Error('Didomi partner fixture failed');
    expect(
      adapter.planPreferences(surface, true, new Set([disagree, partnerAction.target]))?.intent,
    ).toBe('savePreferences');
  });
});
