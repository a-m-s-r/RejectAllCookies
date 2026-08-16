import type { VerificationResult } from '../../cmp/types';

export function surfaceDismissalResult(surfaceStillPresent: boolean): VerificationResult {
  return surfaceStillPresent
    ? { verified: false, reason: 'Consent surface remains present' }
    : {
        verified: false,
        reason: 'Consent surface disappeared, but stored rejection state was not proven',
      };
}
