import { createSelectorAdapter } from './selector-adapter';
import { verifyOneTrustDocument } from '../../core/verification/onetrust';
import { planPreferenceAction } from '../../core/planning/planner';
import { readControlState } from '../../core/controls/state';
import { isElementVisible, type ConsentSurface } from '../../core/detection/surface';
import type { ConsentAction } from '../../core/domain';

const REQUIRED_GROUP_ID = 'C0001';

function groupId(element: HTMLElement): string | null {
  return (
    element.getAttribute('data-optanongroupid') ??
    element.closest<HTMLElement>('[data-optanongroupid]')?.getAttribute('data-optanongroupid') ??
    null
  );
}

function planOneTrustPreferences(
  surface: ConsentSurface,
  allowSave: boolean,
  excluded: ReadonlySet<Element>,
): ConsentAction | null {
  const semanticAction = planPreferenceAction(surface, false, excluded);
  if (semanticAction) return semanticAction;

  const controls = [
    ...surface.root.querySelectorAll<HTMLElement>(
      '[data-optanongroupid] input.category-switch-handler, input.category-switch-handler[data-optanongroupid], [data-optanongroupid] [role="switch"][aria-checked]',
    ),
  ].filter((control) => !excluded.has(control) && isElementVisible(control));
  let unresolved = false;
  for (const control of controls) {
    const id = groupId(control);
    if (!id || id === REQUIRED_GROUP_ID) continue;
    const state = readControlState(control);
    if (state === 'unknown') {
      unresolved = true;
      continue;
    }
    if (state === 'on') {
      return {
        intent: 'disablePurpose',
        target: control,
        evidence: ['adapter:onetrust', `optional-group:${id}`, 'state:on'],
      };
    }
  }
  return allowSave && !unresolved ? planPreferenceAction(surface, true, excluded) : null;
}

export const oneTrustAdapter = {
  ...createSelectorAdapter({
    id: 'onetrust',
    rootSelectors: ['#onetrust-banner-sdk', '#onetrust-pc-sdk'],
    rejectSelectors: ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler'],
    preferenceSelectors: ['#onetrust-pc-btn-handler'],
    verify: verifyOneTrustDocument,
  }),
  planPreferences: planOneTrustPreferences,
};
