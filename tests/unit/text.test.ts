import { describe, expect, it } from 'vitest';
import { classifyAction, matchesConcept, normalizeText } from '../../src/core/classification/text';

describe('semantic text classification', () => {
  it('normalizes unicode punctuation and whitespace', () =>
    expect(normalizeText('  REJECT—ALL! ')).toBe('reject all'));
  it.each(['Reject all', 'Nur notwendige', 'Tout refuser', 'Rechazar todo'])(
    'recognizes privacy-preserving action %s',
    (text) => expect(classifyAction(text)).toBe('rejectAll'),
  );
  it.each([
    'Accept all',
    'Accept selected',
    'Allow partners',
    'Agree and continue',
    'Recommended',
    'Alle akzeptieren',
  ])('marks affirmative consent unsafe: %s', (text) => expect(classifyAction(text)).toBe('unsafe'));
  it('does not misread negated rejection', () =>
    expect(classifyAction('Do not reject')).toBe('unknown'));
  it.each(['Optional analytics', 'Analyse facultatif', 'Werbung', 'Publicidad'])(
    'recognizes localized optional-control context: %s',
    (text) => expect(matchesConcept(text, 'optionalControl')).toBe(true),
  );
});
