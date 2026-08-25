export interface ManualConsentReport {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly text: string;
  readonly element: string;
  readonly createdAt: string;
}

export const MANUAL_REPORTS_KEY = 'manualConsentReports';
export const GITHUB_ISSUE_DRAFT_URL = 'https://github.com/a-m-s-r/RejectAllCookies/issues/new';

export function isManualConsentReport(value: unknown): value is ManualConsentReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.id === 'string' &&
    typeof report.url === 'string' &&
    typeof report.title === 'string' &&
    typeof report.text === 'string' &&
    typeof report.element === 'string' &&
    typeof report.createdAt === 'string'
  );
}

export function issueDraftUrl(report: ManualConsentReport): string {
  const hostname = (() => {
    try {
      return new URL(report.url).hostname;
    } catch {
      return 'unknown site';
    }
  })();
  const title = `Uncaught consent modal: ${hostname}`;
  const body = [
    '## Uncaught consent modal',
    '',
    `Page: ${report.url}`,
    `Reported: ${report.createdAt}`,
    `Element: ${report.element}`,
    '',
    'Visible text snapshot (locally captured):',
    '```text',
    report.text,
    '```',
    '',
    'Please add a safe, privacy-preserving handler for this consent surface.',
  ].join('\n');
  return `${GITHUB_ISSUE_DRAFT_URL}?${new URLSearchParams({ title, body }).toString()}`;
}
