import { accessibleText, classifyAction, matchesConcept } from '../classification/text';
import type { ConsentAction } from '../domain';
import { isElementVisible, type ConsentSurface } from '../detection/surface';
import { readControlState } from '../controls/state';

const ACTION_SELECTOR =
  'button, [role="button"], input[type="button"], input[type="submit"], a[href]';

export function planFirstAction(
  surface: ConsentSurface,
  excluded: ReadonlySet<Element> = new Set(),
): ConsentAction | null {
  const controls = [...surface.root.querySelectorAll<HTMLElement>(ACTION_SELECTOR)].filter(
    (control) => !excluded.has(control) && isElementVisible(control),
  );
  const classified = controls.map((target) => ({
    target,
    text: accessibleText(target),
    meaning: classifyAction(accessibleText(target)),
  }));
  const reject = classified.find(({ meaning }) => meaning === 'rejectAll');
  if (reject)
    return { intent: 'rejectAll', target: reject.target, evidence: [`classified:${reject.text}`] };
  const manage = classified.find(({ meaning }) => meaning === 'openPreferences');
  if (manage)
    return {
      intent: 'openPreferences',
      target: manage.target,
      evidence: [`classified:${manage.text}`],
    };
  const toggleAction = planPreferenceAction(surface, false, excluded);
  if (toggleAction && (toggleAction.intent.includes('disable') || toggleAction.intent === 'objectLegitimateInterest')) {
    return toggleAction;
  }
  
  const toggles = [...surface.root.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR)].filter(
    (control) => !excluded.has(control) && isElementVisible(control),
  );
  for (const toggle of toggles) {
    const state = readControlState(toggle);
    if (state === 'on') {
      const context = normalizeForContext(controlContext(toggle));
      return {
        intent: 'disablePurpose',
        target: toggle,
        evidence: [`toggle:${context.slice(0, 100)}`, 'state:on'],
      };
    }
  }
  return null;
}

const TOGGLE_SELECTOR =
  'input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]';
function controlContext(control: HTMLElement): string {
  const labelledBy = control.getAttribute('aria-labelledby');
  const labelledText = labelledBy
    ?.split(/\s+/u)
    .map((id) => control.ownerDocument.getElementById(id)?.textContent ?? '')
    .join(' ');
  const label =
    control.closest('label') ??
    (control.id
      ? control.ownerDocument.querySelector<HTMLLabelElement>(
          `label[for="${CSS.escape(control.id)}"]`,
        )
      : null);
  const group = control.closest<HTMLElement>('[role="group"], fieldset, li, section, article');
  return (
    accessibleText(control) +
    ' ' +
    (label?.textContent ?? '') +
    ' ' +
    (labelledText ?? '') +
    ' ' +
    (group?.textContent ?? '')
  );
}

export function planPreferenceAction(
  surface: ConsentSurface,
  allowSave: boolean,
  excluded: ReadonlySet<Element> = new Set(),
): ConsentAction | null {
  const actions = [...surface.root.querySelectorAll<HTMLElement>(ACTION_SELECTOR)]
    .filter((target) => !excluded.has(target) && isElementVisible(target))
    .map((target) => ({
      target,
      text: accessibleText(target),
      meaning: classifyAction(accessibleText(target)),
    }));
  const reject = actions.find(({ meaning }) => meaning === 'rejectAll');
  if (reject)
    return { intent: 'rejectAll', target: reject.target, evidence: [`classified:${reject.text}`] };
  const globalOff = actions.find(({ meaning }) => meaning === 'disableAll');
  if (globalOff)
    return {
      intent: 'disablePurpose',
      target: globalOff.target,
      evidence: [`classified:${globalOff.text}`, 'global-disable'],
    };
  const objectAll = actions.find(({ meaning }) => meaning === 'objectAll');
  if (objectAll)
    return {
      intent: 'objectLegitimateInterest',
      target: objectAll.target,
      evidence: [`classified:${objectAll.text}`],
    };

  const controls = [...surface.root.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR)].filter(
    (control) => !excluded.has(control) && isElementVisible(control),
  );
  let unresolvedOptionalControl = false;
  for (const control of controls) {
    const context = normalizeForContext(controlContext(control));
    const isOptional =
      matchesConcept(context, 'optionalControl') ||
      matchesConcept(context, 'vendor') ||
      matchesConcept(context, 'legitimateInterest');
    if (!isOptional || matchesConcept(context, 'requiredControl')) {
      continue;
    }
    const state = readControlState(control);
    if (state === 'unknown') {
      unresolvedOptionalControl = true;
      continue;
    }
    if (state !== 'on') continue;
    const intent = matchesConcept(context, 'legitimateInterest')
      ? 'objectLegitimateInterest'
      : matchesConcept(context, 'vendor')
        ? 'disableVendor'
        : 'disablePurpose';
    return {
      intent,
      target: control,
      evidence: [`optional-control:${context.slice(0, 160)}`, 'state:on'],
    };
  }
  if (allowSave && !unresolvedOptionalControl) {
    const save = actions.find(({ meaning }) => meaning === 'save');
    if (save)
      return {
        intent: 'savePreferences',
        target: save.target,
        evidence: [`classified:${save.text}`, 'privacy-controls-modified'],
      };
  }
  return null;
}

function normalizeForContext(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}
