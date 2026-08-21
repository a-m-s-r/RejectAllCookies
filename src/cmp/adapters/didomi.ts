import type { CmpAdapter } from '../types';
import type { ConsentAction } from '../../core/domain';
import { accessibleText } from '../../core/classification/text';
import { isElementVisible } from '../../core/detection/surface';
import { surfaceDismissalResult } from '../../core/verification/surface';

const RADIO_SELECTOR = '.didomi-components-radio__option[role="radio"]';
const POPUP_SELECTOR =
  '#didomi-popup, [data-testid="dialog-purposes"], [data-testid="dialog-vendors"], .didomi-popup-view';
const vendorTraversalComplete = new WeakSet<Document>();

function visible<T extends HTMLElement>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)].filter(isElementVisible);
}

function denialRadio(root: ParentNode, labels: readonly string[]): HTMLElement | null {
  return (
    visible<HTMLElement>(root, RADIO_SELECTOR).find(
      (control) =>
        control.getAttribute('aria-checked') !== 'true' && labels.includes(accessibleText(control)),
    ) ?? null
  );
}

function denialAction(
  target: HTMLElement,
  intent: 'disablePurpose' | 'disableVendor' | 'objectLegitimateInterest',
): ConsentAction {
  const row = target.closest<HTMLElement>(
    '[class*="data-processing"], [class*="vendor"], li, section',
  );
  return {
    intent,
    target,
    evidence: [
      'adapter:didomi',
      'denial-radio-option',
      accessibleText(row ?? target).slice(0, 160),
    ],
  };
}

export const didomiAdapter: CmpAdapter = {
  id: 'didomi',
  detect(doc) {
    const popupView = visible<HTMLElement>(doc, POPUP_SELECTOR)[0];
    const popup =
      popupView?.closest<HTMLElement>('.didomi-popup-container, .didomi-popup') ??
      popupView?.parentElement ??
      popupView;
    const notice = visible<HTMLElement>(doc, '#didomi-notice')[0];
    const root = popup ?? notice;
    return root
      ? { root, confidence: 100, evidence: ['fingerprint:didomi', popup ? 'popup' : 'notice'] }
      : null;
  },
  plan(surface) {
    const reject = visible<HTMLElement>(
      surface.root,
      '#didomi-notice-disagree-button, .didomi-continue-without-agreeing, [data-testid="notice-disagree-button"]',
    )[0];
    if (reject)
      return { intent: 'rejectAll', target: reject, evidence: ['adapter:didomi', 'direct-reject'] };
    const preferences = visible<HTMLElement>(
      surface.root,
      '#didomi-notice-learn-more-button, [data-testid="notice-learn-more-button"]',
    )[0];
    return preferences
      ? {
          intent: 'openPreferences',
          target: preferences,
          evidence: ['adapter:didomi', 'open-preferences'],
        }
      : null;
  },
  planPreferences(surface, allowSave, excluded) {
    const purposeDenial = denialRadio(surface.root, ['disagree', 'refuse', 'deny']);
    if (purposeDenial && !excluded.has(purposeDenial))
      return denialAction(purposeDenial, 'disablePurpose');

    const vendorDialog =
      surface.root.matches('[data-testid="dialog-vendors"]') ||
      surface.root.querySelector('[data-testid="dialog-vendors"]') !== null;
    const selectedAuthorization = visible<HTMLElement>(
      surface.root,
      `${RADIO_SELECTOR}[aria-checked="true"]`,
    ).find((control) => ['authorize', 'agree', 'accept'].includes(accessibleText(control)));
    if (selectedAuthorization) {
      const group = selectedAuthorization.parentElement;
      const block = group
        ? visible<HTMLElement>(group, RADIO_SELECTOR).find((control) =>
            ['block', 'disagree', 'refuse', 'deny'].includes(accessibleText(control)),
          )
        : undefined;
      if (block && !excluded.has(block)) return denialAction(block, 'disableVendor');
    }

    if (vendorDialog) {
      const back = visible<HTMLElement>(surface.root, 'button, [role="button"], [aria-label]').find(
        (control) =>
          !excluded.has(control) &&
          /(?:go\s+back|return).*(?:consent|preference)|close.*return/iu.test(
            accessibleText(control),
          ),
      );
      if (back) {
        vendorTraversalComplete.add(surface.root.ownerDocument);
        return {
          intent: 'openPreferences',
          target: back,
          evidence: ['adapter:didomi', 'return-after-vendor-traversal'],
        };
      }
    }

    if (vendorTraversalComplete.has(surface.root.ownerDocument)) {
      const save = visible<HTMLElement>(surface.root, '#btn-toggle-save')[0];
      if (save)
        return {
          intent: 'savePreferences',
          target: save,
          evidence: ['adapter:didomi', 'vendor-traversal-complete'],
        };
    }

    const partners = visible<HTMLElement>(
      surface.root,
      '.didomi-consent-popup-view-vendors-list-link',
    ).find((control) => !excluded.has(control));
    if (partners)
      return {
        intent: 'openPreferences',
        target: partners,
        evidence: ['adapter:didomi', 'open-complete-vendor-list'],
      };

    if (allowSave || vendorDialog) {
      // Match semantically within the detected consent root: button identifiers
      // differ between Didomi templates and releases.
      const rootedSave = visible<HTMLElement>(
        surface.root,
        '#btn-toggle-save, button, [role="button"], input[type="submit"]',
      ).find((control) =>
        /^(?:save|confirm|apply)(?:\s+(?:choices|preferences|selection))?$/iu.test(
          accessibleText(control),
        ),
      );
      const skipLink = visible<HTMLAnchorElement>(surface.root, 'a[href^="#"]').find((control) =>
        /skip\s+to\s+["“”']?save/iu.test(accessibleText(control)),
      );
      const anchoredSave = skipLink?.hash
        ? surface.root.ownerDocument.getElementById(decodeURIComponent(skipLink.hash.slice(1)))
        : null;
      const save =
        rootedSave ??
        (anchoredSave instanceof HTMLElement && isElementVisible(anchoredSave)
          ? anchoredSave
          : undefined);
      if (save)
        return {
          intent: 'savePreferences',
          target: save,
          evidence: ['adapter:didomi', 'all-exposed-denials-selected'],
        };
    }
    return null;
  },
  verify(doc) {
    return surfaceDismissalResult(
      visible<HTMLElement>(doc, `${POPUP_SELECTOR}, #didomi-notice`).length > 0,
    );
  },
};
