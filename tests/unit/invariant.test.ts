import { describe, expect, it } from 'vitest';
import { assertSafeAction, PRIVACY_INVARIANT, type ConsentAction } from '../../src/core/domain';

describe(PRIVACY_INVARIANT, () => {
  it('accepts an evidenced privacy-decreasing action', () => {
    const target = document.createElement('button');
    expect(() =>
      assertSafeAction({ intent: 'rejectAll', target, evidence: ['classified:reject all'] }),
    ).not.toThrow();
  });

  it.each(['acceptAll', 'enableOptional', 'consentAll'])(
    'rejects an injected affirmative intent: %s',
    (intent) => {
      const injected = {
        intent,
        target: document.createElement('button'),
        evidence: ['hostile-injection'],
      } as unknown as ConsentAction;
      expect(() => assertSafeAction(injected)).toThrow(PRIVACY_INVARIANT);
    },
  );

  it('rejects actions without semantic evidence', () => {
    const target = document.createElement('button');
    expect(() => assertSafeAction({ intent: 'rejectAll', target, evidence: [] })).toThrow(
      PRIVACY_INVARIANT,
    );
  });
});
