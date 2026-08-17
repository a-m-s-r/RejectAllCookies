import type { VerificationResult } from '../../cmp/types';
import { decodeCookieValue, readDocumentCookie } from './cookies';

interface BinaryEntry {
  readonly id: string;
  readonly active: boolean;
}

function parseBinaryEntries(value: string | null): BinaryEntry[] | null {
  if (value === null) return null;
  const entries = value
    .split(',')
    .filter(Boolean)
    .map((entry) => entry.split(':'));
  if (
    entries.length === 0 ||
    entries.some(([id, state]) => !id || (state !== '0' && state !== '1'))
  ) {
    return null;
  }
  return entries.map(([id, state]) => ({ id: id ?? '', active: state === '1' }));
}

export function verifyOneTrustConsentValue(rawValue: string | null): VerificationResult {
  if (!rawValue) return { verified: false, reason: 'OptanonConsent cookie is absent' };
  const decoded = decodeCookieValue(rawValue);
  if (!decoded) return { verified: false, reason: 'OptanonConsent cookie is malformed' };
  const parameters = new URLSearchParams(decoded);
  const groups = parseBinaryEntries(parameters.get('groups'));
  if (!groups)
    return { verified: false, reason: 'OneTrust category state is missing or malformed' };

  const necessary = groups.find((entry) => entry.id === 'C0001');
  const optionalGroups = groups.filter((entry) => entry.id !== 'C0001');
  const vendorGroups = parseBinaryEntries(parameters.get('genVendors')) ?? [];
  const optionalEvidence = [...optionalGroups, ...vendorGroups];
  if (!necessary?.active) {
    return { verified: false, reason: 'OneTrust necessary-category state is unexpected' };
  }
  if (optionalEvidence.length === 0) {
    return { verified: false, reason: 'OneTrust cookie contains no optional category evidence' };
  }
  if (optionalEvidence.some((entry) => entry.active)) {
    return { verified: false, reason: 'OneTrust reports optional processing still active' };
  }
  return {
    verified: true,
    reason: 'OneTrust cookie proves all recorded optional categories and vendors are inactive',
  };
}

export function verifyOneTrustDocument(doc: Document): VerificationResult {
  return verifyOneTrustConsentValue(readDocumentCookie(doc, 'OptanonConsent'));
}
