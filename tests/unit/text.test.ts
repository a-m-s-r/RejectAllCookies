import { describe, expect, it } from 'vitest';
import {
  accessibleText,
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
  it('preserves word boundaries between adjacent nested elements', () => {
    document.body.innerHTML =
      '<div><h2>Privacy notifications</h2><button>Allow all</button><button>Deny all</button></div>';
    const dialog = document.querySelector('div');
    expect(dialog && accessibleText(dialog)).toBe('privacy notifications allow all deny all');
  });
  it('uses a control aria-label instead of duplicating its decorative content', () => {
    document.body.innerHTML =
      '<button role="radio" aria-label="Disagree"><span>Disagree</span></button>';
    const control = document.querySelector('button');
    expect(control && accessibleText(control)).toBe('disagree');
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
