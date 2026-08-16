import { beforeEach, describe, expect, it } from 'vitest';
import type { ConsentSurface } from '../../src/core/detection/surface';
import { executeAction } from '../../src/core/execution/execute';
import { VendorWalker } from '../../src/core/vendors/walker';

function fixture(): { surface: ConsentSurface; region: HTMLElement } {
  document.body.innerHTML =
    '<div id="surface"><section id="vendor-list"><h3>Vendors and partners</h3><label>Optional vendor A <input type="checkbox" checked></label></section></div>';
  const root = document.querySelector<HTMLElement>('#surface');
  const region = document.querySelector<HTMLElement>('#vendor-list');
  if (!root || !region) throw new Error('Fixture failed');
  Object.defineProperty(region, 'clientHeight', { configurable: true, value: 100 });
  Object.defineProperty(region, 'scrollHeight', { configurable: true, value: 500 });
  return { surface: { root, confidence: 100, evidence: ['fixture'] }, region };
}

describe('bounded vendor traversal', () => {
  beforeEach(() => document.body.replaceChildren());

  it('advances only a scoped scrollable vendor region', () => {
    const { surface, region } = fixture();
    const action = new VendorWalker().nextAction(surface);
    expect(action?.intent).toBe('advanceVendorList');
    expect(action && executeAction(action)).toBe(true);
    expect(region.scrollTop).toBe(80);
  });

  it('allows saving only after the vendor region reaches its end', () => {
    const { surface, region } = fixture();
    const walker = new VendorWalker();
    expect(walker.allowsSave(surface)).toBe(false);
    region.scrollTop = 400;
    expect(walker.nextAction(surface)).toBeNull();
    expect(walker.allowsSave(surface)).toBe(true);
    expect(walker.coverage(surface)).toBe('ui_traversal_complete');
  });

  it('terminates after forty advances when a virtualized list never progresses', () => {
    const { surface } = fixture();
    const walker = new VendorWalker();
    for (let index = 0; index < 40; index += 1) {
      expect(walker.nextAction(surface)?.intent).toBe('advanceVendorList');
    }
    expect(walker.nextAction(surface)).toBeNull();
    expect(walker.allowsSave(surface)).toBe(false);
    expect(walker.coverage(surface)).toBe('incomplete');
  });

  it('ignores a scrollable region outside the detected consent surface', () => {
    const { surface } = fixture();
    const unrelated = document.createElement('section');
    unrelated.id = 'vendor-list-unrelated';
    unrelated.innerHTML = '<h3>Vendors</h3><input type="checkbox" checked>';
    document.body.append(unrelated);
    Object.defineProperty(unrelated, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(unrelated, 'scrollHeight', { configurable: true, value: 500 });
    expect(new VendorWalker().nextAction(surface)?.target).not.toBe(unrelated);
  });
});
