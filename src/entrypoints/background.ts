import { FrameArbiter } from '../platform/frame-arbiter';

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

export default defineBackground(() => {
  const arbiter = new FrameArbiter({ leaseMs: 30_000 });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isClaimMessage(message) || sender.tab?.id === undefined) return undefined;
    return arbiter.claim(sender.tab.id, {
      frameId: sender.frameId ?? 0,
      confidence: message.confidence,
      dedicated: message.dedicated,
      topFrame: message.topFrame,
    });
  });
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') arbiter.release(tabId);
  });
  browser.tabs.onRemoved.addListener((tabId) => arbiter.release(tabId));
});
