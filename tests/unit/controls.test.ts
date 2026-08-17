import { describe, expect, it } from 'vitest';
import { readControlState, setControlOff } from '../../src/core/controls/state';

describe('control safety', () => {
  it('sets a proven checkbox off', () => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    expect(setControlOff(input)).toBe(true);
    expect(input.checked).toBe(false);
  });
  it('refuses to toggle an unknown custom control', () => {
    const button = document.createElement('button');
    let clicked = false;
    button.onclick = () => {
      clicked = true;
    };
    expect(readControlState(button)).toBe('unknown');
    expect(setControlOff(button)).toBe(false);
    expect(clicked).toBe(false);
  });
});
