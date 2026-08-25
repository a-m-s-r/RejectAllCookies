import { ConsentEngine, isInteractionPlan } from '../generic/engine';
import { readSettings } from '../shared/settings';
import { verifyTcfViaPostMessage } from '../core/verification/tcf';
import type { ConsentAction } from '../core/domain';
import { readControlState } from '../core/controls/state';
import { isSweepDisplayMessage } from '../shared/sweep-messages';
import { createSweepIndicator } from '../ui/sweep-indicator';
import { accessibleText, matchesConcept } from '../core/classification/text';

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
    let sweepAttempted = false;
    let summaryShown = false;
    let summaryDisplayed = false;
    let pendingAction: ConsentAction | undefined;
    const sweepIndicator = createSweepIndicator(document);
    let manualReportArmed = false;
    let manualHighlight: HTMLElement | undefined;
    let manualHighlightStyle = '';
    let manualToast: HTMLElement | undefined;

    const clearManualHighlight = () => {
      if (!manualHighlight) return;
      manualHighlight.style.cssText = manualHighlightStyle;
      manualHighlight.removeAttribute('data-minimum-consent-report-target');
      manualHighlight = undefined;
      manualHighlightStyle = '';
    };

    const showManualToast = (message: string) => {
      manualToast?.remove();
      manualToast = document.createElement('div');
      manualToast.setAttribute('role', 'status');
      manualToast.textContent = message;
      Object.assign(manualToast.style, {
        all: 'initial',
        position: 'fixed',
        left: '50%',
        bottom: '20px',
        transform: 'translateX(-50%)',
        zIndex: '2147483647',
        padding: '10px 14px',
        borderRadius: '8px',
        background: '#17202a',
        color: '#fff',
        font: '13px system-ui, sans-serif',
        boxShadow: '0 4px 18px rgba(0,0,0,.35)',
      });
      document.documentElement.append(manualToast);
      window.setTimeout(() => {
        manualToast?.remove();
        manualToast = undefined;
      }, 4000);
    };

    const manualCandidate = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const direct = target.closest<HTMLElement>(
        'dialog, [role="dialog"], [role="alertdialog"], [aria-modal="true"]',
      );
      if (direct && direct !== document.documentElement) return direct;
      let current: HTMLElement | null =
        target instanceof HTMLElement ? target : target.parentElement;
      for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          (style.position === 'fixed' || style.position === 'sticky') &&
          matchesConcept(accessibleText(current), 'consentContext') &&
          (current.querySelector('button, [role="button"], input, [role="switch"]') !== null ||
            matchesConcept(accessibleText(current), 'consentDataContext'))
        )
          return current;
      }
      return null;
    };

    const updateManualHighlight = (target: EventTarget | null) => {
      const candidate = manualCandidate(target);
      if (candidate === manualHighlight) return;
      clearManualHighlight();
      if (!candidate) return;
      manualHighlight = candidate;
      manualHighlightStyle = candidate.style.cssText;
      candidate.setAttribute('data-minimum-consent-report-target', 'true');
      candidate.style.setProperty('outline', '3px solid #ffb000', 'important');
      candidate.style.setProperty('cursor', 'crosshair', 'important');
    };

    const disarmManualReport = () => {
      manualReportArmed = false;
      clearManualHighlight();
      document.removeEventListener('pointermove', onManualPointerMove, true);
      document.removeEventListener('click', onManualClick, true);
      document.removeEventListener('keydown', onManualKeyDown, true);
    };

    const onManualPointerMove = (event: Event) => updateManualHighlight(event.target);
    const onManualKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        disarmManualReport();
        showManualToast('Consent modal report cancelled');
      }
    };
    const onManualClick = (event: MouseEvent) => {
      const candidate = manualCandidate(event.target);
      if (!candidate) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const text = accessibleText(candidate).slice(0, 2000);
      const element =
        `${candidate.tagName.toLowerCase()}${candidate.id ? `#${candidate.id}` : ''}${candidate.className && typeof candidate.className === 'string' ? `.${candidate.className.trim().replace(/\s+/gu, '.')}` : ''}`.slice(
          0,
          300,
        );
      candidate.style.setProperty('display', 'none', 'important');
      disarmManualReport();
      showManualToast('Consent modal hidden; opening a report draft…');
      void browser.runtime.sendMessage({
        type: 'manual-consent-report',
        report: {
          id: crypto.randomUUID(),
          url: location.href,
          title: document.title.slice(0, 300),
          text,
          element,
          createdAt: new Date().toISOString(),
        },
      });
    };

    const armManualReport = () => {
      if (manualReportArmed) return true;
      manualReportArmed = true;
      document.addEventListener('pointermove', onManualPointerMove, true);
      document.addEventListener('click', onManualClick, true);
      document.addEventListener('keydown', onManualKeyDown, true);
      showManualToast('Click the missed consent modal to hide and report it · Esc cancels');
      return true;
    };

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        (message as { type?: string }).type === 'arm-manual-report'
      ) {
        return armManualReport();
      }
      if (window !== window.top || !isSweepDisplayMessage(message)) return undefined;
      if (message.active) {
        sweepIndicator.show();
        return undefined;
      }
      sweepIndicator.hide();
      if (message.summary && !summaryDisplayed) {
        summaryDisplayed = true;
        alert(message.summary);
      }
      return undefined;
    });

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
        const genericControlLabel =
          /^(?:(?:block|authorize|agree|accept|deny|disagree|refuse)\s*)+$/iu.test(detail ?? '');
        if (detail && detail.length > 3 && !detail.startsWith('state:') && !genericControlLabel) {
          vendorNames.add(detail.slice(0, 80));
        }
      }
    };

    const confirmPendingAction = () => {
      if (!pendingAction || !(pendingAction.target instanceof HTMLElement)) return;
      const confirmed = pendingAction.evidence.includes('denial-radio-option')
        ? pendingAction.target.getAttribute('aria-checked') === 'true'
        : readControlState(pendingAction.target) === 'off';
      if (!confirmed) return;
      workflowActions.push(pendingAction.intent);
      recordSweepEvidence(pendingAction);
      pendingAction = undefined;
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

    const relaySweepCompletion = (summary?: string) => {
      const displayLocally = () => {
        if (window !== window.top) return;
        sweepIndicator.hide();
        if (!summary || summaryDisplayed) return;
        summaryDisplayed = true;
        alert(summary);
      };
      void browser.runtime
        .sendMessage({
          type: 'complete-consent-sweep',
          ...(summary ? { summary } : {}),
        })
        .then((delivered: unknown) => {
          if (delivered !== true) displayLocally();
        })
        .catch(displayLocally);
    };

    const pauseSweep = () => {
      clearTimeout(stalledWorkflowTimer);
      relaySweepCompletion();
    };

    const finishSweep = (result: ReturnType<typeof engine.handle>) => {
      if (summaryShown) return;
      summaryShown = true;
      completed = true;
      clearTimeout(stalledWorkflowTimer);
      clearTimeout(observerLifetimeTimer);
      observer.disconnect();
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
      const neutralized =
        result.status === 'rejected_verified' || result.status === 'rejected_unverified';
      const summary = neutralized
        ? `Consent sweep\n\nWebsite wanted: ${requested}${vendorSample ? `. Vendors included: ${vendorSample}` : ''}.\n\nExtension did: ${operations.length > 0 ? operations.join(', ') : 'no safe denial action was available'}.\n\nForced allowed: ${forced}\n\nResult: ${verification}`
        : undefined;
      relaySweepCompletion(summary);
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
      confirmPendingAction();
      const inspection = engine.inspect(document);
      if (!isInteractionPlan(inspection)) {
        if (window === window.top && inspection.status !== 'not_detected') {
          await report(inspection);
        }
        if (workflowActions.length > 0) {
          clearTimeout(stalledWorkflowTimer);
          stalledWorkflowTimer = ctx.setTimeout(() => {
            pauseSweep();
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
      sweepAttempted = true;
      let result = engine.execute(inspection, document);
      if (result.status !== 'interaction_failed') {
        if (pendingAction?.target === inspection.action.target) pendingAction = undefined;
        workflowActions.push(...result.actions);
        recordSweepEvidence(inspection.action);
      } else if (
        inspection.action.intent === 'disablePurpose' ||
        inspection.action.intent === 'disableVendor' ||
        inspection.action.intent === 'objectLegitimateInterest'
      ) {
        pendingAction = inspection.action;
      }
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
      if (result.status === 'interaction_failed') pauseSweep();
      if (completed) finishSweep(result);
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
        if (!completed && sweepAttempted) {
          finishSweep({
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
      sweepAttempted = false;
      summaryShown = false;
      summaryDisplayed = false;
      pendingAction = undefined;
      sweepIndicator.hide();
      arm();
    }, URL_CHECK_INTERVAL_MS);
    arm();
  },
});
