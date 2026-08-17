import { describe, expect, it } from 'vitest';
import { verifyCookiebotConsentValue } from '../../src/core/verification/cookiebot';

describe('Cookiebot persistence verification', () => {
  it('verifies strict JSON with every optional category disabled', () => {
    const value = encodeURIComponent(
      JSON.stringify({ necessary: true, preferences: false, statistics: false, marketing: false }),
    );
    expect(verifyCookiebotConsentValue(value).verified).toBe(true);
  });

  it('verifies the documented legacy JavaScript-object-like format without evaluating it', () => {
    const value = encodeURIComponent(
      "{stamp:'abc',necessary:true,preferences:false,statistics:false,marketing:false,method:'explicit'}",
    );
    expect(verifyCookiebotConsentValue(value).verified).toBe(true);
  });

  it.each([
    null,
    '-1',
    '%E0%A4%A',
    encodeURIComponent('{preferences:false,statistics:false}'),
    encodeURIComponent('{preferences:false,statistics:true,marketing:false}'),
    encodeURIComponent('{preferences:false,statistics:false,marketing:alert(1)}'),
  ])('does not verify absent, incomplete, active, or hostile state', (value) => {
    expect(verifyCookiebotConsentValue(value).verified).toBe(false);
  });
});
