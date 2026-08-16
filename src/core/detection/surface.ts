import { accessibleText, matchesConcept } from '../classification/text';

export interface ConsentSurface {
  readonly root: HTMLElement;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function scoreSurface(element: HTMLElement): ConsentSurface | null {
  if (!isVisible(element)) return null;
  const text = accessibleText(element);
  const evidence: string[] = [];
  let confidence = 0;
  if (matchesConcept(text, 'consentContext')) { confidence += 35; evidence.push('consent vocabulary'); }
  const role = element.getAttribute('role');
  if (role === 'dialog' || role === 'alertdialog' || element.tagName === 'DIALOG') { confidence += 20; evidence.push('dialog semantics'); }
  const style = getComputedStyle(element);
  if (style.position === 'fixed' || style.position === 'sticky') { confidence += 10; evidence.push('overlay positioning'); }
  const actions = [...element.querySelectorAll<HTMLElement>('button, [role="button"], input[type="button"], input[type="submit"], a[href]')];
  if (actions.length >= 2) { confidence += 10; evidence.push('multiple actions'); }
  if (actions.some((action) => /rejectAll|openPreferences/.test(actionMeaning(action)))) { confidence += 25; evidence.push('privacy action'); }
  if (element.closest('form') && !role && style.position !== 'fixed') confidence -= 35;
  return confidence >= 60 ? { root: element, confidence, evidence } : null;
}

import { classifyAction } from '../classification/text';
function actionMeaning(element: Element): string { return classifyAction(accessibleText(element)); }

export function discoverSurfaces(root: Document | ShadowRoot = document): ConsentSurface[] {
  const roots: Array<Document | ShadowRoot> = [root];
  for (let index = 0; index < roots.length; index += 1) {
    const current = roots[index];
    if (!current) continue;
    for (const host of current.querySelectorAll<HTMLElement>('*')) {
      if (host.shadowRoot && !roots.includes(host.shadowRoot)) roots.push(host.shadowRoot);
    }
  }
  const surfaces = roots
    .flatMap((current) => [...current.querySelectorAll<HTMLElement>('dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"], aside, section, div')])
    .map(scoreSurface)
    .filter((value): value is ConsentSurface => value !== null);
  return surfaces
    .filter((surface) => !surfaces.some((other) => other !== surface && other.confidence >= surface.confidence && surface.root.contains(other.root)))
    .sort((a, b) => b.confidence - a.confidence);
}
