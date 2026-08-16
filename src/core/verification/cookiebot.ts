import type { VerificationResult } from '../../cmp/types';
import { decodeCookieValue, readDocumentCookie } from './cookies';

const OPTIONAL_CATEGORIES = ['preferences', 'statistics', 'marketing'] as const;

function parseCookiebotObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    // Cookiebot's documented legacy format is JavaScript-object-like rather than strict JSON.
  }
  try {
    const json = value
      .replace(/([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gu, '$1"$2":')
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/gu, (_match, inner: string) =>
        JSON.stringify(inner.replace(/\\'/gu, "'").replace(/\\\\/gu, '\\')),
      );
    const parsed: unknown = JSON.parse(json);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function verifyCookiebotConsentValue(rawValue: string | null): VerificationResult {
  if (!rawValue) return { verified: false, reason: 'CookieConsent cookie is absent' };
  if (rawValue === '-1') {
    return { verified: false, reason: 'Cookiebot reports consent is not required in this region' };
  }
  const decoded = decodeCookieValue(rawValue);
  if (!decoded) return { verified: false, reason: 'CookieConsent cookie is malformed' };
  const consent = parseCookiebotObject(decoded);
  if (!consent) return { verified: false, reason: 'CookieConsent state is malformed' };
  if (OPTIONAL_CATEGORIES.some((category) => typeof consent[category] !== 'boolean')) {
    return { verified: false, reason: 'CookieConsent optional-category state is incomplete' };
  }
  if (OPTIONAL_CATEGORIES.some((category) => consent[category] === true)) {
    return { verified: false, reason: 'Cookiebot reports optional processing still active' };
  }
  return {
    verified: true,
    reason: 'Cookiebot cookie proves all optional categories are inactive',
  };
}

export function verifyCookiebotDocument(doc: Document): VerificationResult {
  return verifyCookiebotConsentValue(readDocumentCookie(doc, 'CookieConsent'));
}
