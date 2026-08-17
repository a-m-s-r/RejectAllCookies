import { accessibleText, classifyAction } from '../classification/text';
import type { ConsentAction } from '../domain';
import type { ConsentSurface } from '../detection/surface';
import { readControlState } from '../controls/state';

const ACTION_SELECTOR = 'button, [role="button"], input[type="button"], input[type="submit"], a[href]';

export function planFirstAction(surface: ConsentSurface): ConsentAction | null {
  const controls = [...surface.root.querySelectorAll<HTMLElement>(ACTION_SELECTOR)];
  const classified = controls.map((target) => ({ target, text: accessibleText(target), meaning: classifyAction(accessibleText(target)) }));
  const reject = classified.find(({ meaning }) => meaning === 'rejectAll');
  if (reject) return { intent: 'rejectAll', target: reject.target, evidence: [`classified:${reject.text}`] };
  const manage = classified.find(({ meaning }) => meaning === 'openPreferences');
  if (manage) return { intent: 'openPreferences', target: manage.target, evidence: [`classified:${manage.text}`] };

  const toggles = [...surface.root.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR)];
  for (const control of toggles) {
    const context = normalizeForContext(controlContext(control));
    if (!OPTIONAL.test(context) || REQUIRED.test(context) || readControlState(control) !== 'on') continue;
    const intent = /\b(?:vendor|partner)\b/u.test(context) ? 'disableVendor' : 'disablePurpose';
    return { intent, target: control, evidence: [`optional-control:${context.slice(0, 160)}`, 'state:on'] };
  }

  return null;
}

const TOGGLE_SELECTOR = 'input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]';
const OPTIONAL = /\b(?:optional|analytics|measurement|advertis(?:ing|ement)|marketing|personal(?:isation|ization)|vendor|partner|social media)\b/u;
const REQUIRED = /\b(?:strictly necessary|required|essential|security|authentication)\b/u;

function controlContext(control: HTMLElement): string {
  const labelledBy = control.getAttribute('aria-labelledby');
  const labelledText = labelledBy
    ?.split(/\s+/u)
    .map((id) => control.ownerDocument.getElementById(id)?.textContent ?? '')
    .join(' ');
  const label = control.closest('label') ?? (control.id ? control.ownerDocument.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(control.id)}"]`) : null);
  const group = control.closest<HTMLElement>('[role="group"], fieldset, li, section, article');
  return accessibleText(control) + ' ' + (label?.textContent ?? '') + ' ' + (labelledText ?? '') + ' ' + (group?.textContent ?? '');
}

export function planPreferenceAction(surface: ConsentSurface, allowSave: boolean): ConsentAction | null {
  const actions = [...surface.root.querySelectorAll<HTMLElement>(ACTION_SELECTOR)].map((target) => ({ target, text: accessibleText(target), meaning: classifyAction(accessibleText(target)) }));
  const reject = actions.find(({ meaning }) => meaning === 'rejectAll');
  if (reject) return { intent: 'rejectAll', target: reject.target, evidence: [`classified:${reject.text}`] };
  const globalOff = actions.find(({ meaning }) => meaning === 'disableAll');
  if (globalOff) return { intent: 'disablePurpose', target: globalOff.target, evidence: [`classified:${globalOff.text}`, 'global-disable'] };
  const objectAll = actions.find(({ meaning }) => meaning === 'objectAll');
  if (objectAll) return { intent: 'objectLegitimateInterest', target: objectAll.target, evidence: [`classified:${objectAll.text}`] };

  const controls = [...surface.root.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR)];
  for (const control of controls) {
    const context = normalizeForContext(controlContext(control));
    if (!OPTIONAL.test(context) || REQUIRED.test(context) || readControlState(control) !== 'on') continue;
    const intent = /\b(?:vendor|partner)\b/u.test(context) ? 'disableVendor' : 'disablePurpose';
    return { intent, target: control, evidence: [`optional-control:${context.slice(0, 160)}`, 'state:on'] };
  }
  if (allowSave) {
    const save = actions.find(({ meaning }) => meaning === 'save');
    if (save) return { intent: 'savePreferences', target: save.target, evidence: [`classified:${save.text}`, 'privacy-controls-modified'] };
  }
  return null;
}

function normalizeForContext(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}
