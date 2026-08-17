import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), '.output', 'firefox-mv3', 'manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error(`Firefox manifest not found at ${manifestPath}. Run pnpm build:firefox first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const required = [
  'manifest_version',
  'name',
  'version',
  'description',
  'permissions',
  'host_permissions',
  'background',
  'action',
];

for (const key of required) {
  if (!(key in manifest)) {
    throw new Error(`Firefox manifest missing required field: ${key}`);
  }
}

if (manifest.manifest_version !== 3) {
  throw new Error(`Firefox manifest manifest_version must be 3, got ${manifest.manifest_version}`);
}

if (!Array.isArray(manifest.permissions)) {
  throw new Error('Firefox manifest permissions must be an array.');
}

if (!Array.isArray(manifest.host_permissions)) {
  throw new Error('Firefox manifest host_permissions must be an array.');
}

const background = manifest.background;
if (!background || typeof background !== 'object') {
  throw new Error('Firefox manifest background section is missing or invalid.');
}

if (!background.scripts || !Array.isArray(background.scripts) || background.scripts.length === 0) {
  throw new Error('Firefox manifest background.scripts must be a non-empty array.');
}

console.log('Firefox manifest validation passed.');
