import { ConsentEngine, isInteractionPlan } from '../generic/engine';
import { readSettings } from '../shared/settings';
import { verifyTcfViaPostMessage } from '../core/verification/tcf';
import type { ConsentAction } from '../core/domain';

const MAX_OBSERVER_LIFETIME_MS = 60_000;
const STALLED_WORKFLOW_GRACE_MS = 2_500;
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
    let observerLifetimeTimer: number | undefined;
    let stalledWorkflowTimer: number | undefined;
    const workflowActions: ReturnType<typeof engine.handle>['actions'][number][] = [];
    const requestedKinds = new Set<string>();
    const vendorNames = new Set<string>();
    let forcedAllowed = 0;
    let vendorDenials = 0;
    let summaryShown = false;

    const recordSweepEvidence = (action: ConsentAction) => {
      const evidence = action.evidence.join(' ');
      const kinds: readonly (readonly [RegExp, string])[] = [
        [/cookie|storage|device/iu, 'device storage/cookies'],
        [/advert|marketing|tracking|pixel/iu, 'advertising'],
        [/profil/iu, 'profiling'],
        [/personali[sz]/iu, 'personalization'],
        [/measure|analytic|statistic/iu, 'measurement/analytics'],
        [/location|geolocation/iu, 'location data'],
        [/identif|fingerprint|scan|pixel/iu, 'device identification'],
        [/content/iu, 'content selection'],
      ];
      for (const [pattern, label] of kinds) if (pattern.test(evidence)) requestedKinds.add(label);
      if (action.intent === 'disableVendor') {
        const countEvidence = action.evidence.find((item) => item.startsWith('denial-count:'));
        const parsedCount = countEvidence ? Number(countEvidence.slice('denial-count:'.length)) : 1;
        vendorDenials += Number.isFinite(parsedCount) ? parsedCount : 1;
        const detail = (
          action.evidence.find((item) => item.startsWith('optional-control:')) ??
          action.evidence.at(-1)
        )
          ?.replace(/^optional-control:/u, '')
          .replace(/\s+/gu, ' ')
          .trim();
        if (detail && detail.length > 3 && !detail.startsWith('state:')) {
          vendorNames.add(detail.slice(0, 80));
        }
      }
    };

    const countForcedAllowed = (consentRoot: Element) => {
      const roots: (Element | ShadowRoot)[] = [consentRoot];
      for (const root of roots) {
        for (const host of root.querySelectorAll<HTMLElement>('*')) {
          if (host.shadowRoot && !roots.includes(host.shadowRoot)) roots.push(host.shadowRoot);
        }
      }
      forcedAllowed = Math.max(
        forcedAllowed,
        roots.reduce(
          (count, root) =>
            count +
            [...root.querySelectorAll<HTMLElement>(':disabled, [aria-disabled="true"]')].filter(
              (control) =>
                (control instanceof HTMLInputElement && control.checked) ||
                control.getAttribute('aria-checked') === 'true',
            ).length,
          0,
        ),
      );
    };

    const showSweepSummary = (result: ReturnType<typeof engine.handle>) => {
      if (summaryShown || window !== window.top) return;
      summaryShown = true;
      const purposes = workflowActions.filter((action) => action === 'disablePurpose').length;
      const objections = workflowActions.filter(
        (action) => action === 'objectLegitimateInterest',
      ).length;
      const vendorActions = workflowActions.filter((action) => action === 'disableVendor').length;
      const vendorsProcessed = Math.max(vendorDenials, vendorActions);
      const requested = requestedKinds.size > 0 ? [...requestedKinds].join(', ') : 'consent data';
      const vendorSample = [...vendorNames].slice(0, 4).join('; ');
      const operations: string[] = [];
      if (workflowActions.includes('openPreferences')) operations.push('opened privacy settings');
      if (workflowActions.includes('rejectAll'))
        operations.push('used the strongest Reject all option');
      if (purposes > 0) operations.push(`denied ${String(purposes)} purpose(s)`);
      if (vendorsProcessed > 0)
        operations.push(`blocked ${String(vendorsProcessed)} active vendor authorization(s)`);
      if (objections > 0)
        operations.push(`objected to ${String(objections)} legitimate-interest control(s)`);
      if (workflowActions.includes('savePreferences')) operations.push('saved the choices');
      const forced =
        forcedAllowed > 0
          ? `${String(forcedAllowed)} locked required control(s) remained allowed.`
          : 'No locked active controls were observed.';
      const verification =
        result.status === 'rejected_verified'
          ? 'Rejection verified.'
          : result.status === 'rejected_unverified'
            ? 'Saved/rejected, but persistence was not fully verified.'
            : `Sweep incomplete: ${result.reason}`;
      alert(
        `Consent sweep\n\nWebsite wanted: ${requested}${vendorSample ? `. Vendors included: ${vendorSample}` : ''}.\n\nExtension did: ${operations.length > 0 ? operations.join(', ') : 'no safe denial action was available'}.\n\nForced allowed: ${forced}\n\nResult: ${verification}`,
      );
    };

    const report = async (result: ReturnType<typeof engine.handle>) => {
      if (result.status === 'not_detected') return false;
      try {
        await browser.runtime.sendMessage({
          type: 'record-tab-status',
          result: { ...result, actions: [...workflowActions] },
        });
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
        if (workflowActions.length > 0) {
          clearTimeout(stalledWorkflowTimer);
          stalledWorkflowTimer = ctx.setTimeout(() => {
            showSweepSummary({
              status: 'unsupported',
              reason: inspection.reason,
              actions: [...workflowActions],
            });
          }, STALLED_WORKFLOW_GRACE_MS);
        }
        running = false;
        return;
      }
      clearTimeout(stalledWorkflowTimer);
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
      workflowActions.push(...result.actions);
      if (result.status !== 'interaction_failed') recordSweepEvidence(inspection.action);
      countForcedAllowed(
        inspection.action.target.closest<HTMLElement>(
          '[role="dialog"], dialog, [aria-modal="true"]',
        ) ?? inspection.action.target,
      );
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
      if (completed) showSweepSummary(result);
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
      clearTimeout(observerLifetimeTimer);
      clearTimeout(stalledWorkflowTimer);
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal', 'role'],
      });
      observerLifetimeTimer = ctx.setTimeout(() => {
        observer.disconnect();
        if (!completed && workflowActions.length > 0) {
          showSweepSummary({
            status: 'unsupported',
            reason: 'Timed out before every exposed consent layer could be proven complete',
            actions: [...workflowActions],
          });
        }
      }, MAX_OBSERVER_LIFETIME_MS);
      schedule();
    };
    ctx.setInterval(() => {
      if (location.href === observedUrl) return;
      observedUrl = location.href;
      workflowActions.length = 0;
      requestedKinds.clear();
      vendorNames.clear();
      forcedAllowed = 0;
      vendorDenials = 0;
      summaryShown = false;
      arm();
    }, URL_CHECK_INTERVAL_MS);
    arm();
  },
});
