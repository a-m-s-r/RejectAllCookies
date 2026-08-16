import { assertSafeAction, type ConsentAction } from '../domain';
import { setControlOff } from '../controls/state';

export function executeAction(action: ConsentAction): boolean {
  assertSafeAction(action);
  if (!(action.target instanceof HTMLElement) || action.target.hidden || action.target.getAttribute('aria-disabled') === 'true') return false;
  if (action.intent === 'disablePurpose' || action.intent === 'disableVendor' || action.intent === 'objectLegitimateInterest') {
    const state = action.target.getAttribute('aria-checked') ?? action.target.getAttribute('aria-pressed');
    if (action.target.matches('input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]') || state !== null) return setControlOff(action.target);
  }
  action.target.click();
  return true;
}
