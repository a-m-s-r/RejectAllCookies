import { accessibleText, matchesConcept } from '../classification/text';
import type { ConsentSurface } from '../detection/surface';
import type { ConsentAction } from '../domain';

const VENDOR_REGION_SELECTOR = [
  '[data-testid*="vendor" i]',
  '[data-testid*="partner" i]',
  '[id*="vendor" i]',
  '[id*="partner" i]',
  '[class*="vendor" i]',
  '[class*="partner" i]',
  '[aria-label*="vendor" i]',
  '[aria-label*="partner" i]',
].join(', ');
const CONTROL_SELECTOR =
  'input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]';
const MAX_ADVANCES_PER_REGION = 40;
export type VendorCoverage = 'not_present' | 'ui_traversal_complete' | 'incomplete' | 'unverified';

interface RegionState {
  advances: number;
  exhausted: boolean;
}

export class VendorWalker {
  private readonly states = new WeakMap<HTMLElement, RegionState>();

  nextAction(surface: ConsentSurface): ConsentAction | null {
    for (const region of this.regions(surface)) {
      const state = this.stateFor(region);
      if (state.exhausted || this.isAtEnd(region)) continue;
      if (state.advances >= MAX_ADVANCES_PER_REGION) {
        state.exhausted = true;
        continue;
      }
      state.advances += 1;
      return {
        intent: 'advanceVendorList',
        target: region,
        evidence: [
          'scoped-vendor-region',
          `bounded-advance:${String(state.advances)}/${String(MAX_ADVANCES_PER_REGION)}`,
        ],
      };
    }
    return null;
  }

  allowsSave(surface: ConsentSurface): boolean {
    return this.regions(surface).every((region) => {
      const state = this.stateFor(region);
      return !state.exhausted && this.isAtEnd(region);
    });
  }

  coverage(surface: ConsentSurface): VendorCoverage {
    const regions = this.regions(surface);
    if (regions.length === 0) return 'not_present';
    if (regions.some((region) => this.stateFor(region).exhausted)) return 'incomplete';
    if (regions.every((region) => this.isAtEnd(region))) return 'ui_traversal_complete';
    return 'unverified';
  }

  private regions(surface: ConsentSurface): HTMLElement[] {
    return [...surface.root.querySelectorAll<HTMLElement>(VENDOR_REGION_SELECTOR)].filter(
      (region) =>
        matchesConcept(accessibleText(region), 'vendor') &&
        region.querySelector(CONTROL_SELECTOR) !== null &&
        region.scrollHeight > region.clientHeight,
    );
  }

  private stateFor(region: HTMLElement): RegionState {
    const existing = this.states.get(region);
    if (existing) return existing;
    const created = { advances: 0, exhausted: false };
    this.states.set(region, created);
    return created;
  }

  private isAtEnd(region: HTMLElement): boolean {
    return region.scrollTop + region.clientHeight >= region.scrollHeight - 1;
  }
}
