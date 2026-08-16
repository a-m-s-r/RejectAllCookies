import { beforeEach, describe, expect, it } from 'vitest';
import { discoverSurfaces } from '../../src/core/detection/surface';

describe('consent surface scoring', () => {
  beforeEach(() => document.body.replaceChildren());

  it.each([
    '<div role="dialog"><h2>Privacy-friendly newsletter</h2><button>Subscribe</button><button>No thanks</button></div>',
    '<div role="dialog"><h2>Cookie Magazine payment</h2><button>Subscribe</button><button>Sign in</button></div>',
    '<div role="dialog"><h2>Privacy notice</h2><button>Close</button><button>Read policy</button></div>',
  ])('rejects contextual vocabulary without a consent action: %s', (markup) => {
    document.body.innerHTML = markup;
    expect(discoverSurfaces()).toEqual([]);
  });

  it('accepts a preference layer with explicit optional controls', () => {
    document.body.innerHTML =
      '<div role="dialog"><h2>Cookie preferences</h2><label>Optional analytics <input type="checkbox" checked></label><button>Save choices</button></div>';
    expect(discoverSurfaces()).toHaveLength(1);
  });
});
