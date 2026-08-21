import { assertSafeAction, type ConsentAction } from '../domain';
import { setControlOff } from '../controls/state';

export function executeAction(action: ConsentAction): boolean {
  assertSafeAction(action);
  if (!(action.target instanceof HTMLElement) || !isInteractable(action.target)) return false;
  if (action.intent === 'advanceVendorList') {
    const before = action.target.scrollTop;
    const distance = Math.max(1, Math.floor(action.target.clientHeight * 0.8));
    action.target.scrollTop = Math.min(
      action.target.scrollHeight - action.target.clientHeight,
      before + distance,
    );
    action.target.dispatchEvent(new Event('scroll'));
    return action.target.scrollTop > before;
  }
  if (
    action.intent === 'disablePurpose' ||
    action.intent === 'disableVendor' ||
    action.intent === 'objectLegitimateInterest'
  ) {
    if (
      action.target.matches('[role="radio"]') &&
      action.evidence.includes('denial-radio-option')
    ) {
      action.target.click();
      return action.target.getAttribute('aria-checked') === 'true';
    }
    const state =
      action.target.getAttribute('aria-checked') ?? action.target.getAttribute('aria-pressed');
    if (
      action.target.matches(
        'input[type="checkbox"], [role="switch"], [role="checkbox"], [aria-checked], [aria-pressed]',
      ) ||
      state !== null
    )
      return setControlOff(action.target);
  }
  action.target.click();
  return true;
}

function isInteractable(element: HTMLElement): boolean {
  if (
    element.hidden ||
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.closest('[hidden], [inert], [aria-hidden="true"]')
  ) {
    return false;
  }
  const style = getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  ) {
    return false;
  }
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const ancestorStyle = getComputedStyle(ancestor);
    if (
      ancestorStyle.display === 'none' ||
      ancestorStyle.visibility === 'hidden' ||
      ancestorStyle.visibility === 'collapse'
    ) {
      return false;
    }
  }
  return true;
}
