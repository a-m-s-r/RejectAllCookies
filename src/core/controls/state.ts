export type ControlState = 'on' | 'off' | 'unknown';

export function readControlState(element: HTMLElement): ControlState {
  if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) return element.checked ? 'on' : 'off';
  const ariaChecked = element.getAttribute('aria-checked');
  if (ariaChecked === 'true') return 'on';
  if (ariaChecked === 'false') return 'off';
  const ariaPressed = element.getAttribute('aria-pressed');
  if (ariaPressed === 'true') return 'on';
  if (ariaPressed === 'false') return 'off';
  return 'unknown';
}

export function setControlOff(element: HTMLElement): boolean {
  const before = readControlState(element);
  if (before === 'off') return true;
  if (before !== 'on') return false;
  element.click();
  return readControlState(element) === 'off';
}
