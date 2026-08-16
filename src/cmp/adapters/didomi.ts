import { createSelectorAdapter } from './selector-adapter';

export const didomiAdapter = createSelectorAdapter({
  id: 'didomi',
  rootSelectors: ['#didomi-notice', '#didomi-popup'],
  rejectSelectors: ['#didomi-notice-disagree-button', '.didomi-continue-without-agreeing', '[data-testid="notice-disagree-button"]'],
  preferenceSelectors: ['#didomi-notice-learn-more-button', '[data-testid="notice-learn-more-button"]'],
});
