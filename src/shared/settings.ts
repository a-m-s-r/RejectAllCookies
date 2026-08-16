export interface Settings {
  readonly enabled: boolean;
  readonly pausedHosts: readonly string[];
}

export const DEFAULT_SETTINGS: Settings = { enabled: true, pausedHosts: [] };
const SETTINGS_KEY = 'settings';

export async function readSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const candidate = stored[SETTINGS_KEY];
  if (!candidate || typeof candidate !== 'object') return DEFAULT_SETTINGS;
  const record = candidate as Record<string, unknown>;
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
    pausedHosts: Array.isArray(record.pausedHosts)
      ? record.pausedHosts.filter((host): host is string => typeof host === 'string')
      : [],
  };
}

export async function writeSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function purgeLegacyStatusRecords(): Promise<void> {
  const stored = await browser.storage.local.get(null);
  const legacyKeys = Object.keys(stored).filter((key) => key.startsWith('status:'));
  if (legacyKeys.length > 0) await browser.storage.local.remove(legacyKeys);
}
