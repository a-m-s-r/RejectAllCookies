import { describe, expect, it } from 'vitest';
import {
  accessibleText,
  classifyAction,
  matchesConcept,
  normalizeText,
} from '../../src/core/classification/text';

describe('semantic text classification', () => {
  it('normalizes unicode punctuation and whitespace', () =>
    expect(normalizeText('  REJECT—ALL! ')).toBe('reject all'));
  it.each(['Reject all', 'Nur notwendige', 'Tout refuser', 'Rechazar todo'])(
    'recognizes privacy-preserving action %s',
    (text) => expect(classifyAction(text)).toBe('rejectAll'),
  );
  it.each(['Disagree', 'Do not accept'])(
    'recognizes non-affirmative rejection wording %s',
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
  it.each(['disagreement policy', 'agreement settings'])(
    'does not match unsafe vocabulary inside another word: %s',
    (text) => expect(classifyAction(text)).toBe('unknown'),
  );
  it('uses aria-labelledby as part of an action accessible name', () => {
    document.body.innerHTML =
      '<span id="label">Reject all</span><button aria-labelledby="label" />';
    const button = document.querySelector('button');
    expect(button && classifyAction(accessibleText(button))).toBe('rejectAll');
  });
  it('resolves aria-labelledby within an open shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span id="label">Reject all</span><button aria-labelledby="label" />';
    const button = shadow.querySelector('button');
    expect(button && classifyAction(accessibleText(button))).toBe('rejectAll');
  });
  it.each(['Optional analytics', 'Analyse facultatif', 'Werbung', 'Publicidad'])(
    'recognizes localized optional-control context: %s',
    (text) => expect(matchesConcept(text, 'optionalControl')).toBe(true),
  );
});
