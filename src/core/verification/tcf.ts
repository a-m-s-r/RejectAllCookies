import type { VerificationResult } from '../../cmp/types';

type BooleanMap = Readonly<Record<string, boolean>>;

interface TcfData {
  readonly tcString?: unknown;
  readonly cmpStatus?: unknown;
  readonly eventStatus?: unknown;
  readonly gdprApplies?: unknown;
  readonly purposeOneTreatment?: unknown;
  readonly purpose?: {
    readonly consents?: unknown;
    readonly legitimateInterests?: unknown;
  };
  readonly vendor?: {
    readonly consents?: unknown;
    readonly legitimateInterests?: unknown;
  };
  readonly specialFeatureOptins?: unknown;
  readonly publisher?: {
    readonly consents?: unknown;
    readonly legitimateInterests?: unknown;
    readonly customPurpose?: {
      readonly consents?: unknown;
      readonly legitimateInterests?: unknown;
    };
  };
  readonly listenerId?: unknown;
}

function booleanMap(value: unknown): BooleanMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  return entries.every(([, state]) => typeof state === 'boolean')
    ? Object.fromEntries(entries)
    : null;
}

function optionalBooleanMap(value: unknown): BooleanMap | null | undefined {
  return value === undefined ? undefined : booleanMap(value);
}

export function verifyTcfData(value: unknown): VerificationResult {
  if (!value || typeof value !== 'object') {
    return { verified: false, reason: 'TCF data is absent or malformed' };
  }
  const data = value as TcfData;
  if (data.cmpStatus !== 'loaded') {
    return { verified: false, reason: 'TCF CMP is not loaded' };
  }
  if (data.eventStatus !== 'tcloaded' && data.eventStatus !== 'useractioncomplete') {
    return { verified: false, reason: 'TCF choice is not complete' };
  }
  if (data.gdprApplies !== true) {
    return { verified: false, reason: 'TCF data does not establish that GDPR applies' };
  }
  if (typeof data.tcString !== 'string' || data.tcString.length === 0) {
    return { verified: false, reason: 'TCF consent string is absent' };
  }
  if (data.purposeOneTreatment === true) {
    return { verified: false, reason: 'TCF purpose-one treatment remains enabled' };
  }

  const requiredMaps = [
    booleanMap(data.purpose?.consents),
    booleanMap(data.purpose?.legitimateInterests),
    booleanMap(data.vendor?.consents),
    booleanMap(data.vendor?.legitimateInterests),
    booleanMap(data.specialFeatureOptins),
  ];
  const optionalMaps = [
    optionalBooleanMap(data.publisher?.consents),
    optionalBooleanMap(data.publisher?.legitimateInterests),
    optionalBooleanMap(data.publisher?.customPurpose?.consents),
    optionalBooleanMap(data.publisher?.customPurpose?.legitimateInterests),
  ];
  if (requiredMaps.some((map) => map === null) || optionalMaps.some((map) => map === null)) {
    return { verified: false, reason: 'TCF processing-state maps are incomplete or malformed' };
  }
  const maps = [...requiredMaps, ...optionalMaps].filter(
    (map): map is BooleanMap => map !== null && map !== undefined,
  );
  const states = maps.flatMap((map) => Object.values(map));
  if (states.length === 0) {
    return { verified: false, reason: 'TCF data contains no processing-state evidence' };
  }
  if (states.some(Boolean)) {
    return { verified: false, reason: 'TCF reports optional processing still active' };
  }
  return {
    verified: true,
    reason: 'TCF API proves all exposed consent and legitimate-interest signals are inactive',
  };
}

interface TcfReturnMessage {
  readonly __tcfapiReturn: {
    readonly callId: string;
    readonly success: boolean;
    readonly returnValue: unknown;
  };
}

function tcfReturn(value: unknown, callId: string): TcfReturnMessage['__tcfapiReturn'] | null {
  if (!value || typeof value !== 'object') return null;
  const result = (value as { readonly __tcfapiReturn?: unknown }).__tcfapiReturn;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  return record.callId === callId && typeof record.success === 'boolean'
    ? {
        callId,
        success: record.success,
        returnValue: record.returnValue,
      }
    : null;
}

export function verifyTcfViaPostMessage(
  currentWindow: Window = window,
  timeoutMs = 1_000,
): Promise<VerificationResult> {
  const locator = currentWindow.document.querySelector<HTMLIFrameElement>(
    'iframe[name="__tcfapiLocator"]',
  );
  const target = locator?.contentWindow;
  if (!target) return Promise.resolve({ verified: false, reason: 'TCF API locator is absent' });

  return new Promise((resolve) => {
    const callId = crypto.randomUUID();
    let settled = false;
    const finish = (result: VerificationResult) => {
      if (settled) return;
      settled = true;
      currentWindow.removeEventListener('message', onMessage);
      currentWindow.clearTimeout(timer);
      resolve(result);
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== target) return;
      const returned = tcfReturn(event.data, callId);
      if (!returned) return;
      if (!returned.success) {
        finish({ verified: false, reason: 'TCF API listener registration failed' });
        return;
      }
      const verification = verifyTcfData(returned.returnValue);
      if (verification.verified) {
        const listenerId =
          returned.returnValue && typeof returned.returnValue === 'object'
            ? (returned.returnValue as TcfData).listenerId
            : undefined;
        if (typeof listenerId === 'number' || typeof listenerId === 'string') {
          target.postMessage(
            {
              __tcfapiCall: {
                command: 'removeEventListener',
                version: 2,
                callId: crypto.randomUUID(),
                parameter: listenerId,
              },
            },
            '*',
          );
        }
        finish(verification);
      }
    };
    const timer = currentWindow.setTimeout(
      () => finish({ verified: false, reason: 'TCF API did not provide verified state in time' }),
      timeoutMs,
    );
    currentWindow.addEventListener('message', onMessage);
    target.postMessage(
      {
        __tcfapiCall: {
          command: 'addEventListener',
          version: 2,
          callId,
        },
      },
      '*',
    );
  });
}
