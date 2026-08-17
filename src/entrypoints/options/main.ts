import { readSettings, writeSettings } from '../../shared/settings';

type ElementConstructor<T extends Element> = new (...arguments_: never[]) => T;

function requiredElement<T extends Element>(
  selector: string,
  constructor: ElementConstructor<T>,
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Options markup is missing ${selector}`);
  return element;
}

const form = requiredElement('#add-form', HTMLFormElement);
const input = requiredElement('#host', HTMLInputElement);
const error = requiredElement('#error', HTMLElement);
const list = requiredElement('#hosts', HTMLUListElement);
const empty = requiredElement('#empty', HTMLElement);

let settings = await readSettings();
render();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const host = normalizeHost(input.value);
  if (!host) {
    error.textContent = 'Enter a valid hostname without a path.';
    return;
  }
  error.textContent = '';
  settings = { ...settings, pausedHosts: [...new Set([...settings.pausedHosts, host])].sort() };
  input.value = '';
  void persistAndRender();
});

function normalizeHost(value: string): string | null {
  const trimmed = value
    .trim()
    .toLocaleLowerCase()
    .replace(/^https?:\/\//u, '')
    .replace(/\/$/u, '');
  if (!trimmed || trimmed.includes('/') || trimmed.includes('@') || trimmed.includes(':'))
    return null;
  try {
    const url = new URL(`https://${trimmed}`);
    return url.hostname === trimmed && url.hostname.includes('.') ? url.hostname : null;
  } catch {
    return null;
  }
}

async function persistAndRender(): Promise<void> {
  await writeSettings(settings);
  render();
}

function render(): void {
  list.replaceChildren(
    ...settings.pausedHosts.map((host) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = host;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${host}`);
      remove.addEventListener('click', () => {
        settings = {
          ...settings,
          pausedHosts: settings.pausedHosts.filter((candidate) => candidate !== host),
        };
        void persistAndRender();
      });
      item.append(label, remove);
      return item;
    }),
  );
  empty.hidden = settings.pausedHosts.length > 0;
}
