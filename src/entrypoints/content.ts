import { ConsentEngine, isInteractionPlan } from '../generic/engine';
import { readSettings } from '../shared/settings';
import { verifyTcfViaPostMessage } from '../core/verification/tcf';

const MAX_OBSERVER_LIFETIME_MS = 30_000;
const DEBOUNCE_MS = 150;
const URL_CHECK_INTERVAL_MS = 1_000;

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  allFrames: true,
  runAt: 'document_start',
  async main(ctx) {
    const settings = await readSettings();
    if (!settings.enabled || settings.pausedHosts.includes(location.hostname)) return;
    const engine = new ConsentEngine();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let completed = false;
    let running = false;
    let observedUrl = location.href;

    const report = async (result: ReturnType<typeof engine.handle>) => {
      if (result.status === 'not_detected') return false;
      try {
        await browser.runtime.sendMessage({ type: 'record-tab-status', result });
        return true;
      } catch {
        // Diagnostics are best-effort and must never affect consent execution.
        return false;
      }
    };

    const scan = async () => {
      if (completed || running) return;
      running = true;
      const inspection = engine.inspect(document);
      if (!isInteractionPlan(inspection)) {
        if (window === window.top && inspection.status !== 'not_detected') {
          await report(inspection);
        }
        running = false;
        return;
      }
      let granted: unknown;
      try {
        granted = await browser.runtime.sendMessage({
          type: 'claim-consent-action',
          confidence: inspection.confidence,
          dedicated: inspection.dedicated,
          topFrame: window === window.top,
        });
      } catch (error) {
        void report({
          status: 'interaction_failed',
          reason: error instanceof Error ? error.message : 'Frame arbitration failed',
          actions: [],
        });
        running = false;
        return;
      }
      if (granted !== true) {
        running = false;
        return;
      }
      let result = engine.execute(inspection, document);
      if (result.status === 'rejected_unverified') {
        const tcfVerification = await verifyTcfViaPostMessage(window);
        if (tcfVerification.verified) {
          result = {
            ...result,
            status: 'rejected_verified',
            reason: tcfVerification.reason,
          };
        }
      }
      void report(result);
      completed = result.status === 'rejected_verified' || result.status === 'rejected_unverified';
      if (completed) observer.disconnect();
      running = false;
      if (!completed && result.actions.length > 0) schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void scan(), DEBOUNCE_MS);
    };
    const observer = new MutationObserver(schedule);
    const arm = () => {
      completed = false;
      observer.disconnect();
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal', 'role'],
      });
      ctx.setTimeout(() => observer.disconnect(), MAX_OBSERVER_LIFETIME_MS);
      schedule();
    };
    ctx.setInterval(() => {
      if (location.href === observedUrl) return;
      observedUrl = location.href;
      arm();
    }, URL_CHECK_INTERVAL_MS);
    arm();
  },
});
