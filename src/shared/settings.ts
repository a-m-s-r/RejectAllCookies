import type { EngineResult } from '../cmp/types';

export interface Settings {
  readonly enabled: boolean;
  readonly pausedHosts: readonly string[];
}

export const DEFAULT_SETTINGS: Settings = { enabled: true, pausedHosts: [] };
const SETTINGS_KEY = 'settings';
const STATUS_PREFIX = 'status:';

export async function readSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const candidate = stored[SETTINGS_KEY];
  if (!candidate || typeof candidate !== 'object') return DEFAULT_SETTINGS;
  const record = candidate as Record<string, unknown>;
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
    pausedHosts: Array.isArray(record.pausedHosts) ? record.pausedHosts.filter((host): host is string => typeof host === 'string') : [],
  };
}

export async function writeSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function writeSiteStatus(host: string, result: EngineResult): Promise<void> {
  await browser.storage.local.set({ [`${STATUS_PREFIX}${host}`]: { result, updatedAt: Date.now() } });
}

export async function readSiteStatus(host: string): Promise<{ readonly result: EngineResult; readonly updatedAt: number } | null> {
  const key = `${STATUS_PREFIX}${host}`;
  const stored = await browser.storage.local.get(key);
  const value = stored[key];
  return value && typeof value === 'object' ? value as { readonly result: EngineResult; readonly updatedAt: number } : null;
}
