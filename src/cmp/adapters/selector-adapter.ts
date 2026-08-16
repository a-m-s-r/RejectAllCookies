import { accessibleText } from '../../core/classification/text';
import type { ConsentAction } from '../../core/domain';
import type { ConsentSurface } from '../../core/detection/surface';
import type { CmpAdapter } from '../types';
import { surfaceDismissalResult } from '../../core/verification/surface';

export interface SelectorAdapterDefinition {
  readonly id: string;
  readonly rootSelectors: readonly string[];
  readonly rejectSelectors: readonly string[];
  readonly preferenceSelectors: readonly string[];
}

function first(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const match = root.querySelector<HTMLElement>(selector);
    if (match) return match;
  }
  return null;
}

export function createSelectorAdapter(definition: SelectorAdapterDefinition): CmpAdapter {
  return {
    id: definition.id,
    detect(doc) {
      const roots = definition.rootSelectors.flatMap((selector) => [...doc.querySelectorAll<HTMLElement>(selector)]);
      const root = roots.find((candidate) => first(candidate, definition.rejectSelectors) !== null)
        ?? roots.find((candidate) => first(candidate, definition.preferenceSelectors) !== null)
        ?? roots[0]
        ?? null;
      return root ? { root, confidence: 100, evidence: [`fingerprint:${definition.id}`] } : null;
    },
    plan(surface) {
      const reject = first(surface.root, definition.rejectSelectors);
      if (reject) return { intent: 'rejectAll', target: reject, evidence: [`adapter:${definition.id}`, accessibleText(reject)] };
      const preferences = first(surface.root, definition.preferenceSelectors);
      return preferences ? { intent: 'openPreferences', target: preferences, evidence: [`adapter:${definition.id}`, accessibleText(preferences)] } : null;
    },
    verify(doc) {
      return surfaceDismissalResult(first(doc, definition.rootSelectors) !== null);
    },
  };
}
