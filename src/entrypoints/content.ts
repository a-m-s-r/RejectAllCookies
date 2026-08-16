import { ConsentEngine, isInteractionPlan } from '../generic/engine';
import { readSettings, writeSiteStatus } from '../shared/settings';

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

    const scan = async () => {
      if (completed || running) return;
      running = true;
      const inspection = engine.inspect(document);
      if (!isInteractionPlan(inspection)) {
        if (window === window.top && inspection.status !== 'not_detected') {
          await writeSiteStatus(location.hostname, inspection);
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
        if (window === window.top) {
          void writeSiteStatus(location.hostname, {
            status: 'interaction_failed',
            reason: error instanceof Error ? error.message : 'Frame arbitration failed',
            actions: [],
          });
        }
        running = false;
        return;
      }
      if (granted !== true) {
        running = false;
        return;
      }
      const result = engine.execute(inspection, document);
      if (window === window.top && result.status !== 'not_detected') void writeSiteStatus(location.hostname, result);
      completed = result.status === 'rejected_verified' || result.status === 'rejected_unverified';
      if (completed) observer.disconnect();
      running = false;
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void scan(), DEBOUNCE_MS);
    };
    const observer = new MutationObserver(schedule);
    const arm = () => {
      completed = false;
      observer.disconnect();
      observer.observe(document, { childList: true, subtree: true });
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
