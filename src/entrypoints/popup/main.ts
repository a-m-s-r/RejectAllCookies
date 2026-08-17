import type { EngineResult } from '../../cmp/types';
import { readSettings, writeSettings } from '../../shared/settings';

const enabled = document.querySelector<HTMLInputElement>('#enabled');
const paused = document.querySelector<HTMLInputElement>('#paused');
const site = document.querySelector<HTMLElement>('#site');
const status = document.querySelector<HTMLElement>('#status');
const manageSites = document.querySelector<HTMLButtonElement>('#manage-sites');
const diagnostics = document.querySelector<HTMLDetailsElement>('#diagnostics');
const diagnosticText = document.querySelector<HTMLElement>('#diagnostic-text');
if (!enabled || !paused || !site || !status || !manageSites || !diagnostics || !diagnosticText) {
  throw new Error('Popup markup is incomplete');
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
    status.textContent = formatStatus(recorded.result.status);
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
