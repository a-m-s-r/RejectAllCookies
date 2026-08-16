import { createSelectorAdapter } from './selector-adapter';

export const quantcastAdapter = createSelectorAdapter({
  id: 'quantcast',
  rootSelectors: ['.qc-cmp2-container'],
  rejectSelectors: ['button[data-testid="reject-all"]', '#reject-all-btn'],
  preferenceSelectors: ['button[aria-label="More options"]', 'button[title="More options"]'],
});
