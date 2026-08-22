export interface SweepDisplayMessage {
  readonly type: 'display-consent-sweep';
  readonly active: boolean;
  readonly summary?: string;
}

export interface SweepCompleteMessage {
  readonly type: 'complete-consent-sweep';
  readonly summary?: string;
}

export function isSweepDisplayMessage(value: unknown): value is SweepDisplayMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === 'display-consent-sweep' &&
    typeof message.active === 'boolean' &&
    (message.summary === undefined || typeof message.summary === 'string')
  );
}

export function isSweepCompleteMessage(value: unknown): value is SweepCompleteMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === 'complete-consent-sweep' &&
    (message.summary === undefined ||
      (typeof message.summary === 'string' &&
        message.summary.startsWith('Consent sweep') &&
        message.summary.length <= 4_000))
  );
}
