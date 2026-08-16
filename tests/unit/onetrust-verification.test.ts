import { describe, expect, it } from 'vitest';
import { verifyOneTrustConsentValue } from '../../src/core/verification/onetrust';

describe('OneTrust persistence verification', () => {
  it('verifies necessary-only categories and rejected general vendors', () => {
    const value = encodeURIComponent(
      'consentId=fixture&groups=C0001:1,C0002:0,C0003:0,C0004:0&genVendors=V10:0,V20:0',
    );
    expect(verifyOneTrustConsentValue(value).verified).toBe(true);
  });

  it('rejects evidence with any active optional category', () => {
    const value = encodeURIComponent('groups=C0001:1,C0002:0,C0004:1&genVendors=V10:0');
    expect(verifyOneTrustConsentValue(value)).toMatchObject({
      verified: false,
      reason: 'OneTrust reports optional processing still active',
    });
  });

  it.each([
    null,
    '%not-valid',
    encodeURIComponent('groups=C0001:1'),
    encodeURIComponent('groups=C0001:0,C0002:0'),
    encodeURIComponent('groups=C0001:1,C0002:x'),
  ])('does not verify incomplete or malformed evidence: %s', (value) => {
    expect(verifyOneTrustConsentValue(value).verified).toBe(false);
  });
});
