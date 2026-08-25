import { FrameArbiter } from '../platform/frame-arbiter';
import type { EngineResult } from '../cmp/types';
import { purgeLegacyStatusRecords } from '../shared/settings';
import { isSweepCompleteMessage, type SweepDisplayMessage } from '../shared/sweep-messages';
import {
  issueDraftUrl,
  isManualConsentReport,
  MANUAL_REPORTS_KEY,
  type ManualConsentReport,
} from '../shared/manual-reports';

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

function isManualReportMessage(
  value: unknown,
): value is { type: 'manual-consent-report'; report: ManualConsentReport } {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.type === 'manual-consent-report' && isManualConsentReport(message.report);
}

export default defineBackground(() => {
  void purgeLegacyStatusRecords();
  const arbiter = new FrameArbiter({ leaseMs: 30_000 });
  const tabStatuses = new Map<
    number,
    { readonly result: EngineResult; readonly updatedAt: number }
  >();

  const displaySweep = async (tabId: number, message: SweepDisplayMessage) => {
    try {
      await browser.tabs.sendMessage(tabId, message, { frameId: 0 });
      return true;
    } catch {
      // A top-frame script may be unavailable on browser-owned or unloading pages.
      return false;
    }
  };

  // WebExtension message listeners intentionally return promises for asynchronous replies.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (isClaimMessage(message) && sender.tab?.id !== undefined) {
      const tabId = sender.tab.id;
      return arbiter
        .claim(tabId, {
          frameId: sender.frameId ?? 0,
          confidence: message.confidence,
          dedicated: message.dedicated,
          topFrame: message.topFrame,
        })
        .then(async (granted) => {
          if (granted) await displaySweep(tabId, { type: 'display-consent-sweep', active: true });
          return granted;
        });
    }
    if (isSweepCompleteMessage(message) && sender.tab?.id !== undefined) {
      return displaySweep(sender.tab.id, {
        type: 'display-consent-sweep',
        active: false,
        ...(message.summary ? { summary: message.summary } : {}),
      });
    }
    if (isManualReportMessage(message) && sender.tab?.id !== undefined) {
      return browser.storage.local.get(MANUAL_REPORTS_KEY).then(async (stored) => {
        const existing = Array.isArray(stored[MANUAL_REPORTS_KEY])
          ? stored[MANUAL_REPORTS_KEY].filter(isManualConsentReport)
          : [];
        const reports = [...existing, message.report].slice(-100);
        await browser.storage.local.set({ [MANUAL_REPORTS_KEY]: reports });
        await browser.tabs.create({ url: issueDraftUrl(message.report) });
        return { report: message.report, issueUrl: issueDraftUrl(message.report) };
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
      if (record.type === 'get-manual-reports') {
        return browser.storage.local
          .get(MANUAL_REPORTS_KEY)
          .then((stored) =>
            Array.isArray(stored[MANUAL_REPORTS_KEY])
              ? stored[MANUAL_REPORTS_KEY].filter(isManualConsentReport)
              : [],
          );
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
