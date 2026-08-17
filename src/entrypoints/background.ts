import { FrameArbiter } from '../platform/frame-arbiter';
import type { EngineResult } from '../cmp/types';
import { purgeLegacyStatusRecords } from '../shared/settings';

interface ClaimMessage {
  readonly type: 'claim-consent-action';
  readonly confidence: number;
  readonly dedicated: boolean;
  readonly topFrame: boolean;
}

function isClaimMessage(value: unknown): value is ClaimMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === 'claim-consent-action' &&
    typeof message.confidence === 'number' &&
    Number.isFinite(message.confidence) &&
    message.confidence >= 0 &&
    message.confidence <= 100 &&
    typeof message.dedicated === 'boolean' &&
    typeof message.topFrame === 'boolean'
  );
}

function isEngineResult(value: unknown): value is EngineResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.status === 'string' &&
    typeof result.reason === 'string' &&
    Array.isArray(result.actions)
  );
}

export default defineBackground(() => {
  void purgeLegacyStatusRecords();
  const arbiter = new FrameArbiter({ leaseMs: 30_000 });
  const tabStatuses = new Map<
    number,
    { readonly result: EngineResult; readonly updatedAt: number }
  >();

  // WebExtension message listeners intentionally return promises for asynchronous replies.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (isClaimMessage(message) && sender.tab?.id !== undefined) {
      return arbiter.claim(sender.tab.id, {
        frameId: sender.frameId ?? 0,
        confidence: message.confidence,
        dedicated: message.dedicated,
        topFrame: message.topFrame,
      });
    }
    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      if (
        record.type === 'record-tab-status' &&
        sender.tab?.id !== undefined &&
        isEngineResult(record.result)
      ) {
        tabStatuses.set(sender.tab.id, { result: record.result, updatedAt: Date.now() });
        return undefined;
      }
      if (record.type === 'get-tab-status' && typeof record.tabId === 'number') {
        return Promise.resolve(tabStatuses.get(record.tabId) ?? null);
      }
    }
    return undefined;
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      arbiter.release(tabId);
      tabStatuses.delete(tabId);
    }
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    arbiter.release(tabId);
    tabStatuses.delete(tabId);
  });
});
