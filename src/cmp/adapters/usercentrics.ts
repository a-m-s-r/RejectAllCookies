import type { CmpAdapter } from '../types';
import { surfaceDismissalResult } from '../../core/verification/surface';
import { isElementVisible } from '../../core/detection/surface';
import { accessibleText, matchesConcept } from '../../core/classification/text';
import { planPreferenceAction } from '../../core/planning/planner';

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
  planPreferences(surface, allowSave, excluded) {
    const privacyAction = planPreferenceAction(surface, false, excluded);
    if (privacyAction) return privacyAction;

    const detailLayer = [
      ...surface.root.querySelectorAll<HTMLElement>(
        'button, [role="button"], [data-testid*="service" i], [data-testid*="vendor" i], [data-testid*="partner" i]',
      ),
    ].find((control) => {
      if (excluded.has(control) || !isElementVisible(control)) return false;
      const testId = control.getAttribute('data-testid') ?? '';
      const text = accessibleText(control);
      return (
        /(?:service|vendor|partner).*(?:list|detail|setting)|(?:show|view|manage).*(?:service|vendor|partner)/iu.test(
          testId,
        ) || matchesConcept(text, 'vendor')
      );
    });
    if (detailLayer)
      return {
        intent: 'openPreferences',
        target: detailLayer,
        evidence: ['adapter:usercentrics', 'open-vendor-or-service-layer'],
      };
    return planPreferenceAction(surface, allowSave, excluded);
  },
  verify(doc) {
    const rejectStillPresent =
      doc
        .querySelector('#usercentrics-root')
        ?.shadowRoot?.querySelector('[data-testid="uc-deny-all-button"]') !== null;
    return surfaceDismissalResult(rejectStillPresent);
  },
};
