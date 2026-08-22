import { accessibleText, matchesConcept } from '../classification/text';

export interface ConsentSurface {
  readonly root: HTMLElement;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export function isElementVisible(element: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current; current = composedParent(current)) {
    if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.opacity === '0'
    ) {
      return false;
    }
  }
  return true;
}

function composedParent(element: HTMLElement): HTMLElement | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null;
}

export function scoreSurface(element: HTMLElement): ConsentSurface | null {
  const text = accessibleText(element);
  if (!matchesConcept(text, 'consentContext') || !isElementVisible(element)) return null;
  if (matchesConcept(text, 'nonConsentContext')) return null;
  const evidence: string[] = [];
  let confidence = 35;
  evidence.push('consent vocabulary');
  const role = element.getAttribute('role');
  const hasDialogSemantics =
    role === 'dialog' ||
    role === 'alertdialog' ||
    element.tagName === 'DIALOG' ||
    element.getAttribute('aria-modal') === 'true';
  if (hasDialogSemantics) {
    confidence += 20;
    evidence.push('dialog semantics');
  }
  const style = getComputedStyle(element);
  const hasOverlayPosition = style.position === 'fixed' || style.position === 'sticky';
  if (hasOverlayPosition) {
    confidence += 10;
    evidence.push('overlay positioning');
  }
  const actions = [
    ...element.querySelectorAll<HTMLElement>(
      'button, [role="button"], input[type="button"], input[type="submit"], a[href]',
    ),
  ].filter(isElementVisible);
  if (actions.length >= 2) {
    confidence += 10;
    evidence.push('multiple actions');
  }
  const actionMeanings = actions.map(actionMeaning);
  const hasPrivacyAction = actionMeanings.some((meaning) =>
    /rejectAll|openPreferences/u.test(meaning),
  );
  const hasConsentChoicePair =
    actionMeanings.includes('rejectAll') && actionMeanings.includes('unsafe');
  if (hasPrivacyAction) {
    confidence += 25;
    evidence.push('privacy action');
  }
  const hasPreferenceControls =
    element.querySelector(
      'input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]',
    ) !== null &&
    (matchesConcept(text, 'optionalControl') ||
      matchesConcept(text, 'vendor') ||
      matchesConcept(text, 'legitimateInterest'));
  if (hasPreferenceControls) {
    confidence += 20;
    evidence.push('consent preference controls');
  }
  const hasConsentDataContext = matchesConcept(text, 'consentDataContext');
  const hasProvenConsentContext =
    hasConsentDataContext || hasPreferenceControls || hasConsentChoicePair;
  if (!hasProvenConsentContext || (!hasDialogSemantics && !hasOverlayPosition)) return null;
  if (element.closest('form') && !role && style.position !== 'fixed') confidence -= 35;
  return confidence >= 60 && (hasPrivacyAction || hasPreferenceControls)
    ? { root: element, confidence, evidence }
    : null;
}

import { classifyAction } from '../classification/text';
function actionMeaning(element: Element): string {
  return classifyAction(accessibleText(element));
}

export function discoverSurfaces(root: Document | ShadowRoot = document): ConsentSurface[] {
  const roots: (Document | ShadowRoot)[] = [root];
  for (const current of roots) {
    for (const host of current.querySelectorAll<HTMLElement>('*')) {
      if (host.shadowRoot && !roots.includes(host.shadowRoot)) roots.push(host.shadowRoot);
    }
  }
  const surfaces = roots
    .flatMap((current) => [
      ...current.querySelectorAll<HTMLElement>(
        'dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], aside, section, div',
      ),
    ])
    .map(scoreSurface)
    .filter((value): value is ConsentSurface => value !== null);
  return surfaces
    .filter(
      (surface) =>
        !surfaces.some(
          (other) =>
            other !== surface &&
            other.confidence >= surface.confidence &&
            surface.root.contains(other.root),
        ),
    )
    .sort((a, b) => b.confidence - a.confidence);
}
