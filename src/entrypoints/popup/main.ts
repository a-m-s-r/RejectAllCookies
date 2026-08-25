import type { EngineResult } from '../../cmp/types';
import { readSettings, writeSettings } from '../../shared/settings';
import {
  isManualConsentReport,
  issueDraftUrl,
  type ManualConsentReport,
} from '../../shared/manual-reports';

const enabled = document.querySelector<HTMLInputElement>('#enabled');
const paused = document.querySelector<HTMLInputElement>('#paused');
const site = document.querySelector<HTMLElement>('#site');
const status = document.querySelector<HTMLElement>('#status');
const manageSites = document.querySelector<HTMLButtonElement>('#manage-sites');
const diagnostics = document.querySelector<HTMLDetailsElement>('#diagnostics');
const diagnosticText = document.querySelector<HTMLElement>('#diagnostic-text');
const reportModal = document.querySelector<HTMLButtonElement>('#report-modal');
const reports = document.querySelector<HTMLElement>('#reports');
const reportCount = document.querySelector<HTMLElement>('#report-count');
const exportReports = document.querySelector<HTMLButtonElement>('#export-reports');
const reportList = document.querySelector<HTMLUListElement>('#report-list');
if (
  !enabled ||
  !paused ||
  !site ||
  !status ||
  !manageSites ||
  !diagnostics ||
  !diagnosticText ||
  !reportModal ||
  !reports ||
  !reportCount ||
  !exportReports ||
  !reportList
) {
  throw new Error('Popup markup is incomplete');
}

const reportedModals = (await browser.runtime.sendMessage({
  type: 'get-manual-reports',
})) as unknown;
const reportItems: ManualConsentReport[] = Array.isArray(reportedModals)
  ? reportedModals.filter(isManualConsentReport)
  : [];
if (reportItems.length > 0) {
  reports.hidden = false;
  reportCount.textContent = `${String(reportItems.length)} locally saved report(s)`;
  for (const report of [...reportItems].reverse().slice(0, 10)) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = issueDraftUrl(report);
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = new URL(report.url).hostname;
    item.append(link, ` · ${new Date(report.createdAt).toLocaleString()}`);
    reportList.append(item);
  }
}

const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
const host = tab?.url?.startsWith('http') ? new URL(tab.url).hostname : null;
let settings = await readSettings();
enabled.checked = settings.enabled;

if (host) {
  site.textContent = host;
  paused.disabled = false;
  paused.checked = settings.pausedHosts.includes(host);
  const recorded: { readonly result: EngineResult; readonly updatedAt: number } | null =
    tab?.id === undefined
      ? null
      : await browser.runtime.sendMessage({ type: 'get-tab-status', tabId: tab.id });
  if (recorded) {
    status.textContent = formatSweep(recorded.result);
    diagnostics.hidden = false;
    diagnosticText.textContent = JSON.stringify(
      {
        status: recorded.result.status,
        reason: recorded.result.reason,
        adapter: recorded.result.adapter ?? null,
        actions: recorded.result.actions,
        details: recorded.result.details ?? null,
        updatedAt: new Date(recorded.updatedAt).toISOString(),
      },
      null,
      2,
    );
  }
}

function formatSweep(result: EngineResult): string {
  const purposes = result.actions.filter((action) => action === 'disablePurpose').length;
  const vendors = result.actions.filter((action) => action === 'disableVendor').length;
  const objections = result.actions.filter(
    (action) => action === 'objectLegitimateInterest',
  ).length;
  const parts = [formatStatus(result.status)];
  if (purposes > 0) parts.push(`${String(purposes)} purpose denial(s)`);
  if (vendors > 0) parts.push(`${String(vendors)} vendor denial sweep(s)`);
  if (objections > 0) parts.push(`${String(objections)} legitimate-interest objection(s)`);
  if (result.actions.includes('savePreferences')) parts.push('saved');
  return parts.join(' · ');
}

enabled.addEventListener('change', () => {
  settings = { ...settings, enabled: enabled.checked };
  void writeSettings(settings);
});

paused.addEventListener('change', () => {
  if (!host) return;
  const pausedHosts = paused.checked
    ? [...new Set([...settings.pausedHosts, host])]
    : settings.pausedHosts.filter((candidate) => candidate !== host);
  settings = { ...settings, pausedHosts };
  void writeSettings(settings);
});

manageSites.addEventListener('click', () => void browser.runtime.openOptionsPage());

reportModal.addEventListener('click', () => {
  void (async () => {
    if (tab?.id === undefined) {
      status.textContent = 'This page cannot be manually reported.';
      return;
    }
    try {
      const armed = (await browser.tabs.sendMessage(tab.id, {
        type: 'arm-manual-report',
      })) as unknown;
      status.textContent =
        armed === true
          ? 'Click the missed consent modal; press Esc to cancel.'
          : 'Could not arm modal reporting on this page.';
    } catch {
      status.textContent = 'This page does not allow manual modal reporting.';
    }
  })();
});

exportReports.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(reportItems, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'minimum-consent-manual-reports.json';
  link.click();
  URL.revokeObjectURL(url);
});

function formatStatus(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    rejected_verified: 'Rejected and verified',
    rejected_unverified: 'Rejected; persistence unverified',
    hidden_after_rejection: 'Hidden after rejection',
    hidden_only: 'Hidden only; tracking may continue',
    unsupported: 'Consent surface needs further handling',
    interaction_failed: 'Consent interaction failed',
  };
  return labels[value] ?? 'No consent result recorded.';
}
