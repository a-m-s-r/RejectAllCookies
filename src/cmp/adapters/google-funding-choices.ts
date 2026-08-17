import { createSelectorAdapter } from './selector-adapter';

export const googleFundingChoicesAdapter = createSelectorAdapter({
  id: 'google-funding-choices',
  rootSelectors: ['.fc-consent-root', '.fc-dialog-container'],
  rejectSelectors: ['button.fc-cta-do-not-consent', '[data-testid="consent-reject"]'],
  preferenceSelectors: ['button.fc-cta-manage-options'],
});
