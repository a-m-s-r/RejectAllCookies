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
  const title = element.getAttribute('title') ?? '';
  return normalizeText(`${labelled} ${title} ${element.textContent}`);
}

export function matchesConcept(text: string, concept: Concept): boolean {
  const normalized = normalizeText(text);
  return LEXICON[concept].some((phrase) => normalized.includes(normalizeText(phrase)));
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
