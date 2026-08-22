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
      'input[id^="CybotCookiebotDialogBodyLevelButtonPreferences"], input[id^="CybotCookiebotDialogBodyLevelButtonStatistics"], input[id^="CybotCookiebotDialogBodyLevelButtonMarketing"], [name="preferences"], [name="statistics"], [name="marketing"]',
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

function isKnownCookiebotControlAvailable(control: HTMLElement): boolean {
  if (isElementVisible(control)) return true;
  return (
    control instanceof HTMLInputElement &&
    !control.disabled &&
    control.isConnected &&
    control.parentElement instanceof HTMLElement &&
    isElementVisible(control.parentElement)
  );
}

function knownCategory(control: HTMLElement): string | null {
  const match = /CybotCookiebotDialogBodyLevelButton(Preferences|Statistics|Marketing)/u.exec(
    control.id,
  );
  return match?.[1]?.toLocaleLowerCase() ?? null;
}

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
      (control) => !excluded.has(control) && isKnownCookiebotControlAvailable(control),
    );
    for (const control of controls) {
      const state = readControlState(control);
      if (state === 'unknown') {
        unresolved = true;
        continue;
      }
      if (state === 'on') {
        const category = knownCategory(control);
        return {
          intent: group.intent,
          target: control,
          evidence: [
            `adapter:cookiebot`,
            `known-control:${group.intent}`,
            ...(category ? [`category:${category}`] : []),
            'state:on',
          ],
        };
      }
    }
  }

  if (!allowSave || unresolved) return null;
  const semanticSave = planPreferenceAction(surface, true, excluded);
  if (semanticSave) return semanticSave;
  const allowSelection = [
    ...surface.root.querySelectorAll<HTMLElement>(
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection',
    ),
  ].find((control) => !excluded.has(control) && isElementVisible(control));
  return allowSelection
    ? {
        intent: 'savePreferences',
        target: allowSelection,
        evidence: ['adapter:cookiebot', 'all-known-optional-controls-off', 'save-selection'],
      }
    : null;
}

const selectorAdapter = createSelectorAdapter({
  id: 'cookiebot',
  rootSelectors: ['#CybotCookiebotDialog'],
  rejectSelectors: ['#CybotCookiebotDialogBodyButtonDecline', '[data-cookiefirst-action="reject"]'],
  preferenceSelectors: ['#CybotCookiebotDialogBodyLevelButtonCustomize'],
  verify: verifyCookiebotDocument,
});

export const cookiebotAdapter = {
  ...selectorAdapter,
  plan(surface: ConsentSurface) {
    return selectorAdapter.plan(surface) ?? planCookiebotPreferences(surface, false, new Set());
  },
  planPreferences: planCookiebotPreferences,
};
