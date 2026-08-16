import { describe, expect, it } from 'vitest';
import { surfaceDismissalResult } from '../../src/core/verification/surface';

describe('verification truthfulness', () => {
  it('does not claim persistence from cosmetic disappearance', () => {
    expect(surfaceDismissalResult(false)).toEqual({
      verified: false,
      reason: 'Consent surface disappeared, but stored rejection state was not proven',
    });
  });

  it('does not verify while the consent surface remains', () => {
    expect(surfaceDismissalResult(true).verified).toBe(false);
  });
});
