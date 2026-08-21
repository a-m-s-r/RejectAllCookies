import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentEngine, handleConsent } from '../../src/generic/engine';

describe('generic engine', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });
  function requiredInput(selector: string): HTMLInputElement {
    const input = document.querySelector(selector);
    if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input ${selector}`);
    return input;
  }
  it('selects reject and never accept', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button></div>';
    const accept = vi.fn();
    const reject = vi.fn();
    document.querySelector('#accept')?.addEventListener('click', accept);
    document.querySelector('#reject')?.addEventListener('click', reject);
    expect(handleConsent().actions).toEqual(['rejectAll']);
    expect(reject).toHaveBeenCalledOnce();
    expect(accept).not.toHaveBeenCalled();
  });
  it('does not emit automatic page-console diagnostics', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button>Accept all</button><button>Reject all</button></div>';
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    handleConsent();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('does not interact during inspection before frame authorization', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button></div>';
    const engine = new ConsentEngine();
    const accept = vi.fn();
    const reject = vi.fn();
    document.querySelector('#accept')?.addEventListener('click', accept);
    document.querySelector('#reject')?.addEventListener('click', reject);
    const inspection = engine.inspect();
    expect('action' in inspection && inspection.action.intent).toBe('rejectAll');
    expect(accept).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });
  it('does not execute a CSS-hidden reject lure', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="reject" style="display:none">Reject all</button><button>Accept all</button></div>';
    const reject = vi.fn();
    document.querySelector('#reject')?.addEventListener('click', reject);
    expect(handleConsent().status).toBe('not_detected');
    expect(reject).not.toHaveBeenCalled();
  });
  it('ignores a hidden reject lure when a visible safe action exists', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="hidden" style="display:none">Reject all</button><button id="visible">Manage preferences</button><button>Accept all</button></div>';
    const hidden = vi.fn();
    const visible = vi.fn();
    document.querySelector('#hidden')?.addEventListener('click', hidden);
    document.querySelector('#visible')?.addEventListener('click', visible);
    expect(handleConsent().actions).toEqual(['openPreferences']);
    expect(hidden).not.toHaveBeenCalled();
    expect(visible).toHaveBeenCalledOnce();
  });
  it('does not plan the same persistent action target twice', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="reject">Reject all</button><button>Accept all</button></div>';
    const engine = new ConsentEngine();
    expect(engine.handle().actions).toEqual(['rejectAll']);
    expect(engine.inspect()).toMatchObject({
      status: 'unsupported',
      reason: 'No semantically safe action found',
    });
  });
  it('leaves ordinary forms untouched', () => {
    document.body.innerHTML =
      '<form><h2>Login</h2><p>Read our privacy policy</p><input type="checkbox"><button>Agree</button><button>Sign in</button></form>';
    expect(handleConsent().status).toBe('not_detected');
    expect(requiredInput('input').checked).toBe(false);
  });
  it.each([
    '<div role="dialog"><h2>Subscribe</h2><p>Privacy-friendly newsletter</p><button>Agree</button><button>No thanks</button></div>',
    '<div role="dialog"><h2>Verify your age</h2><p>We value privacy</p><button>I am over 18</button><button>Leave</button></div>',
    '<div role="dialog"><h2>Payment required</h2><p>Cookie Magazine</p><button>Subscribe</button><button>Sign in</button></div>',
  ])('does not act on a non-consent modal', (markup) => {
    document.body.innerHTML = markup;
    const click = vi.fn();
    document.querySelector('button')?.addEventListener('click', click);
    expect(handleConsent().status).toBe('not_detected');
    expect(click).not.toHaveBeenCalled();
  });
  it('discovers a consent surface in open shadow DOM', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie consent</h2><button>Accept all</button><button id="reject">Reject all</button></div>';
    const reject = vi.fn();
    shadow.querySelector('#reject')?.addEventListener('click', reject);
    expect(handleConsent().actions).toEqual(['rejectAll']);
    expect(reject).toHaveBeenCalledOnce();
  });
  it('uses a dedicated OneTrust action', () => {
    document.body.innerHTML =
      '<div id="onetrust-banner-sdk"><button id="onetrust-reject-all-handler">Reject</button></div>';
    const reject = vi.fn();
    document.querySelector('button')?.addEventListener('click', reject);
    const result = handleConsent();
    expect(result.adapter).toBe('onetrust');
    expect(reject).toHaveBeenCalledOnce();
  });
  it('disables OneTrust optional groups while preserving the required group', () => {
    document.body.innerHTML =
      '<div id="onetrust-banner-sdk"><button id="onetrust-pc-btn-handler">Settings</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('button')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div id="onetrust-pc-sdk"><div data-optanongroupid="C0001"><input id="required" class="category-switch-handler" type="checkbox" checked></div><div data-optanongroupid="C0002"><input id="analytics" class="category-switch-handler" type="checkbox" checked></div><button>Save preferences</button></div>';
    });
    expect(engine.handle().actions).toEqual(['openPreferences']);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(requiredInput('#required').checked).toBe(true);
    expect(requiredInput('#analytics').checked).toBe(false);
    expect(engine.handle().actions).toEqual(['savePreferences']);
  });

  it('blocks OneTrust saving when an optional group state is unresolved', () => {
    document.body.innerHTML =
      '<div id="onetrust-banner-sdk"><button id="onetrust-pc-btn-handler">Settings</button></div>';
    const engine = new ConsentEngine();
    const save = vi.fn();
    document.querySelector('button')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div id="onetrust-pc-sdk"><div data-optanongroupid="C0002"><button class="category-switch-handler">Ukendt</button></div><button id="save">Save preferences</button></div>';
      document.querySelector('#save')?.addEventListener('click', save);
    });
    engine.handle();
    expect(engine.handle().status).toBe('unsupported');
    expect(save).not.toHaveBeenCalled();
  });
  it('opens settings, switches proven optional processing off, and saves', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><label>Optional analytics <input id="analytics" type="checkbox" checked></label><button id="save">Save choices</button></div>';
    });
    expect(engine.handle().actions).toEqual(['openPreferences']);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(requiredInput('#analytics').checked).toBe(false);
    expect(engine.handle().actions).toEqual(['savePreferences']);
  });
  it('does not save selected preferences before proving minimization', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    const save = vi.fn();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><button id="save">Save choices</button><button>Accept selected</button></div>';
      document.querySelector('#save')?.addEventListener('click', save);
    });
    engine.handle();
    expect(engine.handle().status).toBe('unsupported');
    expect(save).not.toHaveBeenCalled();
  });
  it('does not save while any semantically optional control has unknown state', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    const save = vi.fn();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><label>Optional analytics <input id="known" type="checkbox" checked></label><div role="group">Optional personalization <button id="unknown" role="switch">Toggle</button></div><button id="save">Save choices</button></div>';
      document.querySelector('#save')?.addEventListener('click', save);
    });
    engine.handle();
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().status).toBe('unsupported');
    expect(requiredInput('#known').checked).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
  it('does not switch off required authentication controls', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><label>Required authentication and security <input id="required" type="checkbox" checked></label><button>Save choices</button></div>';
    });
    engine.handle();
    expect(engine.handle().status).toBe('unsupported');
    expect(requiredInput('#required').checked).toBe(true);
  });
  it('does not disable a required first-layer toggle after optional controls are already off', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>Cookie preferences</h2><label>Required authentication <input id="required" type="checkbox" checked></label><label>Optional analytics <input id="optional" type="checkbox"></label></div>';
    const result = handleConsent();
    expect(result.status).toBe('unsupported');
    expect(requiredInput('#required').checked).toBe(true);
    expect(requiredInput('#optional').checked).toBe(false);
  });
  it('saves a first-layer preference surface after disabling its optional controls', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>Cookie preferences</h2><label>Optional analytics <input id="optional" type="checkbox" checked></label><button id="save">Save choices</button></div>';
    const engine = new ConsentEngine();
    const save = vi.fn();
    document.querySelector('#save')?.addEventListener('click', save);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().actions).toEqual(['savePreferences']);
    expect(save).toHaveBeenCalledOnce();
  });
  it('objects to a proven-on individual legitimate-interest control', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Privacy preferences</h2><label>Legitimate interest for measurement <span id="li" role="switch" aria-checked="true"></span></label><button>Save choices</button></div>';
      document.querySelector('#li')?.addEventListener('click', (event) => {
        (event.currentTarget as HTMLElement).setAttribute('aria-checked', 'false');
      });
    });
    engine.handle();
    expect(engine.handle().actions).toEqual(['objectLegitimateInterest']);
    expect(document.querySelector('#li')?.getAttribute('aria-checked')).toBe('false');
  });
  it('continues scanning after each privacy control change without relying on DOM mutation', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><label>Optional analytics <input id="analytics" type="checkbox" checked></label><label>Optional marketing <input id="marketing" type="checkbox" checked></label><button>Save choices</button></div>';
    });
    engine.handle();
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().actions).toEqual(['savePreferences']);
    expect(requiredInput('#analytics').checked).toBe(false);
    expect(requiredInput('#marketing').checked).toBe(false);
  });
  it('records completed vendor UI traversal when saving', () => {
    document.body.innerHTML =
      '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML =
        '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><section id="vendor-list"><h3>Vendors and partners</h3><label>Optional vendor A <input type="checkbox" checked></label></section><button>Save choices</button></div>';
      const region = document.querySelector<HTMLElement>('#vendor-list');
      if (!region) throw new Error('Vendor fixture failed');
      Object.defineProperty(region, 'clientHeight', { configurable: true, value: 100 });
      Object.defineProperty(region, 'scrollHeight', { configurable: true, value: 500 });
      region.scrollTop = 400;
    });
    engine.handle();
    expect(engine.handle().actions).toEqual(['disableVendor']);
    expect(engine.handle()).toMatchObject({
      actions: ['savePreferences'],
      details: { vendorCoverage: 'ui_traversal_complete' },
    });
  });
  it('uses Cookiebot identifiers to disable localized categories and legitimate interest', () => {
    document.body.innerHTML =
      '<div id="CybotCookiebotDialog"><button id="CybotCookiebotDialogBodyLevelButtonCustomize">Indstillinger</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('button')?.addEventListener('click', () => {
      document.querySelector('#CybotCookiebotDialog')?.replaceChildren();
      const dialog = document.querySelector('#CybotCookiebotDialog');
      if (!(dialog instanceof HTMLElement)) throw new Error('Cookiebot fixture failed');
      dialog.innerHTML =
        '<input id="CybotCookiebotDialogBodyLevelButtonStatistics" type="checkbox" checked><input id="CybotCookiebotDialogBodyLevelButtonIABPurposeLegitimateInterest1" type="checkbox" checked><button>Save preferences</button>';
    });
    expect(engine.handle().actions).toEqual(['openPreferences']);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().actions).toEqual(['objectLegitimateInterest']);
    expect(engine.handle().actions).toEqual(['savePreferences']);
  });

  it('blocks Cookiebot saving when a known control state is unresolved', () => {
    document.body.innerHTML =
      '<div id="CybotCookiebotDialog"><button id="CybotCookiebotDialogBodyLevelButtonCustomize">Settings</button></div>';
    const engine = new ConsentEngine();
    const save = vi.fn();
    document.querySelector('button')?.addEventListener('click', () => {
      const dialog = document.querySelector('#CybotCookiebotDialog');
      if (!(dialog instanceof HTMLElement)) throw new Error('Cookiebot fixture failed');
      dialog.innerHTML =
        '<input id="CybotCookiebotDialogBodyLevelButtonStatistics" type="checkbox" checked><button id="CybotCookiebotDialogBodyLevelButtonIABVendorConsent1" role="switch">Ukendt</button><button id="save">Save preferences</button>';
      document.querySelector('#save')?.addEventListener('click', save);
    });
    engine.handle();
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect(engine.handle().status).toBe('unsupported');
    expect(save).not.toHaveBeenCalled();
  });
});
