import { beforeEach, describe, expect, it } from 'vitest';
import { discoverSurfaces } from '../../src/core/detection/surface';

describe('consent surface scoring', () => {
  beforeEach(() => document.body.replaceChildren());

  it.each([
    '<div role="dialog"><h2>Privacy-friendly newsletter</h2><button>Subscribe</button><button>No thanks</button></div>',
    '<div role="dialog"><h2>Cookie Magazine payment</h2><button>Subscribe</button><button>Sign in</button></div>',
    '<div role="dialog"><h2>Privacy notice</h2><button>Close</button><button>Read policy</button></div>',
    '<div role="dialog"><h2>Privacy settings product tour</h2><button>Manage preferences</button><button>Next</button></div>',
    '<div role="dialog"><h2>Privacy notifications</h2><button>Allow all</button><button>Deny all</button></div>',
    '<div role="dialog"><h2>Location access and privacy</h2><button>Allow all</button><button>Deny all</button></div>',
    '<div role="dialog"><h2>Privacy account settings</h2><button>Reject all changes</button><button>Save preferences</button></div>',
  ])('rejects consent-like vocabulary in a non-consent context: %s', (markup) => {
    document.body.innerHTML = markup;
    expect(discoverSurfaces()).toEqual([]);
  });

  it('accepts a preference layer with explicit optional controls', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>Cookie preferences</h2><label>Optional analytics <input type="checkbox" checked></label><button>Save choices</button></div>';
    expect(discoverSurfaces()).toHaveLength(1);
  });

  it('accepts an explicit privacy choice pair without requiring the word cookie', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>We value your privacy</h2><button>Reject all</button><button>Accept all</button></div>';
    expect(discoverSurfaces()).toHaveLength(1);
  });

  it('accepts common data-use wording without requiring an explicit cookie label', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>How we use your data</h2><p>Our vendors and partners process information for advertising purposes.</p><button>Reject all</button><button>Agree</button></div>';
    expect(discoverSurfaces()).toHaveLength(1);
  });

  it('rejects consent-like content embedded in an ordinary page section', () => {
    document.body.innerHTML =
      '<section><h2>Cookie privacy choices documentation</h2><button>Reject all example</button><button>Accept all example</button></section>';
    expect(discoverSurfaces()).toEqual([]);
  });

  it('ignores consent controls inside a hidden shadow host', () => {
    const host = document.createElement('div');
    host.hidden = true;
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<div role="dialog"><h2>Cookie consent</h2><button>Reject all</button><button>Accept all</button></div>';
    expect(discoverSurfaces()).toEqual([]);
  });
});
