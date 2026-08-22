import { describe, expect, it } from 'vitest';
import { createSweepIndicator } from '../../src/ui/sweep-indicator';

describe('sweep progress indicator', () => {
  it('shows once, explains the background work, and removes itself', () => {
    document.body.innerHTML = '';
    const indicator = createSweepIndicator(document);

    indicator.show();
    indicator.show();

    const hosts = document.querySelectorAll('[data-minimum-consent-sweep="active"]');
    expect(hosts).toHaveLength(1);
    expect(hosts[0]?.getAttribute('role')).toBe('status');
    expect(hosts[0]?.shadowRoot?.textContent).toContain('Minimum Consent is working');
    expect(hosts[0]?.shadowRoot?.textContent).toContain(
      'Please wait before opening privacy settings',
    );
    expect((hosts[0] as HTMLElement | undefined)?.style.pointerEvents).toBe('none');

    indicator.hide();
    expect(document.querySelector('[data-minimum-consent-sweep]')).toBeNull();
  });
});
