import { describe, expect, it, vi } from 'vitest';
import { executeAction } from '../../src/core/execution/execute';

describe('safe action execution', () => {
  it('runs a framework handler without navigating to a javascript URL', () => {
    const link = document.createElement('a');
    link.href = 'javascript:window.__unsafeNavigation = true';
    const handler = vi.fn();
    link.addEventListener('click', handler);
    document.body.append(link);

    expect(
      executeAction({
        intent: 'openPreferences',
        target: link,
        evidence: ['classified:privacy settings'],
      }),
    ).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    expect(
      (window as Window & { __unsafeNavigation?: boolean }).__unsafeNavigation,
    ).toBeUndefined();
  });
});
