import { LEXICON, type Concept } from '../../localization/lexicon';

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function accessibleText(element: Element): string {
  const labelled = element.getAttribute('aria-label') ?? '';
  const root = element.getRootNode();
  const labelledBy = (element.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) => {
      const label =
        root instanceof ShadowRoot
          ? root.getElementById(id)
          : element.ownerDocument.getElementById(id);
      return label?.textContent ?? '';
    })
    .join(' ');
  const title = element.getAttribute('title') ?? '';
  const value =
    element instanceof HTMLInputElement && ['button', 'submit'].includes(element.type)
      ? element.value
      : '';
  const textParts: string[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent) textParts.push(node.textContent);
  }
  const explicitName = labelledBy || labelled || title || value;
  const isControl = element.matches(
    'button, a, input, select, textarea, [role="button"], [role="radio"], [role="switch"], [role="checkbox"], [role="tab"]',
  );
  return normalizeText(
    isControl && explicitName
      ? explicitName
      : `${labelled} ${labelledBy} ${title} ${value} ${textParts.join(' ')}`,
  );
}

export function matchesConcept(text: string, concept: Concept): boolean {
  const normalized = normalizeText(text);
  const padded = ` ${normalized} `;
  return LEXICON[concept].some((phrase) => padded.includes(` ${normalizeText(phrase)} `));
}

export type ActionMeaning =
  | 'rejectAll'
  | 'openPreferences'
  | 'disableAll'
  | 'objectAll'
  | 'save'
  | 'unsafe'
  | 'unknown';

export function classifyAction(text: string): ActionMeaning {
  const normalized = normalizeText(text);
  if (
    !normalized ||
    /\b(?:do not|don t|nicht|ne pas|no)\s+(?:reject|refuse|ablehnen|refuser)\b/u.test(normalized)
  )
    return 'unknown';
  if (matchesConcept(normalized, 'unsafePositive')) return 'unsafe';
  if (matchesConcept(normalized, 'necessaryOnly') || matchesConcept(normalized, 'reject'))
    return 'rejectAll';
  if (matchesConcept(normalized, 'disableAll')) return 'disableAll';
  if (matchesConcept(normalized, 'object')) return 'objectAll';
  if (matchesConcept(normalized, 'manage')) return 'openPreferences';
  if (matchesConcept(normalized, 'save')) return 'save';
  return 'unknown';
}
