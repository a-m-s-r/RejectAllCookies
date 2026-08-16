import { createSelectorAdapter } from './selector-adapter';
import { verifyCookiebotDocument } from '../../core/verification/cookiebot';
import { planPreferenceAction } from '../../core/planning/planner';
import { readControlState } from '../../core/controls/state';
import { isElementVisible, type ConsentSurface } from '../../core/detection/surface';
import type { ActionIntent, ConsentAction } from '../../core/domain';

interface KnownControlGroup {
  readonly selector: string;
  readonly intent: Extract<
    ActionIntent,
    'disablePurpose' | 'disableVendor' | 'objectLegitimateInterest'
  >;
}

const KNOWN_CONTROL_GROUPS: readonly KnownControlGroup[] = [
  {
    selector:
      '#CybotCookiebotDialogBodyLevelButtonPreferences, #CybotCookiebotDialogBodyLevelButtonStatistics, #CybotCookiebotDialogBodyLevelButtonMarketing, [name="preferences"], [name="statistics"], [name="marketing"]',
    intent: 'disablePurpose',
  },
  {
    selector: '[id*="CybotCookiebotDialogBodyLevelButtonIABVendorConsent"]',
    intent: 'disableVendor',
  },
  {
    selector:
      '[id*="CybotCookiebotDialogBodyLevelButtonIABPurposeLegitimateInterest"], [id*="CybotCookiebotDialogBodyLevelButtonIABVendorLegitimateInterest"]',
    intent: 'objectLegitimateInterest',
  },
];

function planCookiebotPreferences(
  surface: ConsentSurface,
  allowSave: boolean,
  excluded: ReadonlySet<Element>,
): ConsentAction | null {
  const semanticAction = planPreferenceAction(surface, false, excluded);
  if (semanticAction) return semanticAction;

  let unresolved = false;
  for (const group of KNOWN_CONTROL_GROUPS) {
    const controls = [...surface.root.querySelectorAll<HTMLElement>(group.selector)].filter(
      (control) => !excluded.has(control) && isElementVisible(control),
    );
    for (const control of controls) {
      const state = readControlState(control);
      if (state === 'unknown') {
        unresolved = true;
        continue;
      }
      if (state === 'on') {
        return {
          intent: group.intent,
          target: control,
          evidence: [`adapter:cookiebot`, `known-control:${group.intent}`, 'state:on'],
        };
      }
    }
  }

  return allowSave && !unresolved ? planPreferenceAction(surface, true, excluded) : null;
}

export const cookiebotAdapter = {
  ...createSelectorAdapter({
    id: 'cookiebot',
    rootSelectors: ['#CybotCookiebotDialog'],
    rejectSelectors: [
      '#CybotCookiebotDialogBodyButtonDecline',
      '[data-cookiefirst-action="reject"]',
    ],
    preferenceSelectors: ['#CybotCookiebotDialogBodyLevelButtonCustomize'],
    verify: verifyCookiebotDocument,
  }),
  planPreferences: planCookiebotPreferences,
};
