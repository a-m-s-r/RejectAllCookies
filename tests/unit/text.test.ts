import { describe, expect, it } from 'vitest';
import {
  classifyAction,
  matchesConcept,
  normalizeText,
} from '../../src/core/classification/text';
import { planFirstAction } from '../../src/core/planning/planner';

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
  ])(
    'marks affirmative consent unsafe: %s',
    (text) => expect(classifyAction(text)).toBe('unsafe'),
  );

  it('does not misread negated rejection', () =>
    expect(classifyAction('Do not reject')).toBe('unknown'));

  it.each(['Optional analytics', 'Analyse facultatif', 'Werbung', 'Publicidad'])(
    'recognizes localized optional-control context: %s',
    (text) => expect(matchesConcept(text, 'optionalControl')).toBe(true),
  );
});

describe('planning fallback actions', () => {
  it('falls back to optional toggles when no explicit reject button is present', () => {
    document.body.innerHTML = `
      <div role="dialog" aria-label="Cookie settings">
        <label>
          <input type="checkbox" checked />
          Marketing cookies
        </label>
        <label>
          <input type="checkbox" checked />
          Analytics cookies
        </label>
      </div>
    `;

    const action = planFirstAction({
      root: document.body,
      confidence: 70,
      evidence: ['consent vocabulary'],
    });

    expect(action?.intent).toBe('disablePurpose');
    expect(action?.target).toBeTruthy();
  });
});
