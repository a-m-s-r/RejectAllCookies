import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentEngine, handleConsent } from '../../src/generic/engine';

describe('generic engine', () => {
  beforeEach(() => { document.body.replaceChildren(); });
  it('selects reject and never accept', () => {
    document.body.innerHTML = '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button></div>';
    const accept = vi.fn(); const reject = vi.fn();
    document.querySelector('#accept')?.addEventListener('click', accept);
    document.querySelector('#reject')?.addEventListener('click', reject);
    expect(handleConsent().actions).toEqual(['rejectAll']); expect(reject).toHaveBeenCalledOnce(); expect(accept).not.toHaveBeenCalled();
  });
  it('does not interact during inspection before frame authorization', () => {
    document.body.innerHTML = '<div role="dialog" style="position:fixed"><h2>Cookie privacy consent</h2><button id="accept">Accept all</button><button id="reject">Reject all</button></div>';
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
  it('leaves ordinary forms untouched', () => {
    document.body.innerHTML = '<form><h2>Login</h2><p>Read our privacy policy</p><input type="checkbox"><button>Agree</button><button>Sign in</button></form>';
    expect(handleConsent().status).toBe('not_detected');
    expect((document.querySelector('input') as HTMLInputElement).checked).toBe(false);
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
    shadow.innerHTML = '<div role="dialog" style="position:fixed"><h2>Cookie consent</h2><button>Accept all</button><button id="reject">Reject all</button></div>';
    const reject = vi.fn();
    shadow.querySelector('#reject')?.addEventListener('click', reject);
    expect(handleConsent().actions).toEqual(['rejectAll']);
    expect(reject).toHaveBeenCalledOnce();
  });
  it('uses a dedicated OneTrust action', () => {
    document.body.innerHTML = '<div id="onetrust-banner-sdk"><button id="onetrust-reject-all-handler">Reject</button></div>';
    const reject = vi.fn(); document.querySelector('button')?.addEventListener('click', reject);
    const result = handleConsent(); expect(result.adapter).toBe('onetrust'); expect(reject).toHaveBeenCalledOnce();
  });
  it('opens settings, switches proven optional processing off, and saves', () => {
    document.body.innerHTML = '<div role="dialog" style="position:fixed"><h2>Cookie privacy choices</h2><button id="manage">Manage preferences</button></div>';
    const engine = new ConsentEngine();
    document.querySelector('#manage')?.addEventListener('click', () => {
      document.body.innerHTML = '<div role="dialog" style="position:fixed"><h2>Cookie preferences</h2><label>Optional analytics <input id="analytics" type="checkbox" checked></label><button id="save">Save choices</button></div>';
    });
    expect(engine.handle().actions).toEqual(['openPreferences']);
    expect(engine.handle().actions).toEqual(['disablePurpose']);
    expect((document.querySelector('#analytics') as HTMLInputElement).checked).toBe(false);
    expect(engine.handle().actions).toEqual(['savePreferences']);
  });
});
