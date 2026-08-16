import type { CmpAdapter } from '../types';
import { surfaceDismissalResult } from '../../core/verification/surface';
import { isElementVisible } from '../../core/detection/surface';

function firstVisible(root: ParentNode, selectors: string): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>(selectors)].find(isElementVisible) ?? null;
}

export const usercentricsAdapter: CmpAdapter = {
  id: 'usercentrics',
  detect(doc) {
    const host = doc.querySelector<HTMLElement>('#usercentrics-root');
    const root =
      host?.shadowRoot?.querySelector<HTMLElement>(
        '[role="dialog"], [data-testid="uc-default-ui"]',
      ) ?? host?.shadowRoot?.firstElementChild;
    return root instanceof HTMLElement && isElementVisible(root)
      ? { root, confidence: 100, evidence: ['fingerprint:usercentrics', 'open-shadow-root'] }
      : null;
  },
  plan(surface) {
    const reject = firstVisible(surface.root, '[data-testid="uc-deny-all-button"]');
    if (reject)
      return {
        intent: 'rejectAll',
        target: reject,
        evidence: ['adapter:usercentrics', 'testid:uc-deny-all-button'],
      };
    const preferences = firstVisible(
      surface.root,
      '[data-testid="uc-more-button"], [data-testid="uc-customize-button"]',
    );
    return preferences
      ? {
          intent: 'openPreferences',
          target: preferences,
          evidence: ['adapter:usercentrics', 'preferences-testid'],
        }
      : null;
  },
  verify(doc) {
    const rejectStillPresent =
      doc
        .querySelector('#usercentrics-root')
        ?.shadowRoot?.querySelector('[data-testid="uc-deny-all-button"]') !== null;
    return surfaceDismissalResult(rejectStillPresent);
  },
};
